#include "mqtt_link.h"
#include "config.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "lwip/dns.h"   // re-apply DNS servers each attempt to survive DHCP renews

// We keep BOTH a plain and a TLS client so the user can choose at runtime via
// the captive portal's "TLS (1/0)" field. Only one is attached to PubSubClient.
static WiFiClient        s_plain;
static WiFiClientSecure  s_tls;
static PubSubClient      s_mqtt;
static Settings          s_cfg;
static mqtt_link::CmdHandler s_handler = nullptr;
static uint32_t          s_lastTry = 0;
static String            s_baseTopic;
static String            s_clientId;
static String            s_cmdSub;

static void onMessage(char* topic, uint8_t* payload, unsigned int len) {
    String t(topic);
    int idx = t.indexOf("/cmd/");
    if (idx < 0 || !s_handler) return;
    String sub = t.substring(idx + 5);
    s_handler(sub.c_str(), payload, len);
}

namespace mqtt_link {

String topic(const char* leaf) { return s_baseTopic + "/" + leaf; }

static bool tryConnect() {
    // If WiFi is down, ask it to reconnect — by default ESP32 auto-reconnects,
    // but a one-shot call after a long outage helps recover faster.
    if (WiFi.status() != WL_CONNECTED) {
        WiFi.reconnect();
        return false;
    }
    if (s_cfg.mqttHost.length() == 0)  return false;
    if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) return false;

    // Close any stale TCP socket from the previous attempt — after a WiFi drop,
    // the WiFiClient holds onto a dead socket fd and refuses to open a new one
    // until explicitly stopped. This is THE fix for "MQTT fails after WiFi reconnect".
    s_plain.stop();
    s_tls.stop();

    Serial.printf("Net: IP=%s GW=%s  Broker=%s:%u TLS=%d\n",
                  WiFi.localIP().toString().c_str(),
                  WiFi.gatewayIP().toString().c_str(),
                  s_cfg.mqttHost.c_str(), s_cfg.mqttPort, s_cfg.mqttTls ? 1 : 0);

    // Re-apply Google DNS each attempt — DHCP renewals can wipe lwIP's DNS table.
    // Skipped when the broker host is already an IP literal (LAN broker case).
    {
        ip_addr_t dns1, dns2;
        IP4_ADDR(&dns1.u_addr.ip4, 8, 8, 8, 8);
        dns1.type = IPADDR_TYPE_V4;
        IP4_ADDR(&dns2.u_addr.ip4, 8, 8, 4, 4);
        dns2.type = IPADDR_TYPE_V4;
        dns_setserver(0, &dns1);
        dns_setserver(1, &dns2);
    }

    // DNS lookup (works for plain IPs too — returns the same address)
    IPAddress resolvedIp;
    if (!WiFi.hostByName(s_cfg.mqttHost.c_str(), resolvedIp)) {
        Serial.printf("DNS failed for %s\n", s_cfg.mqttHost.c_str());
        return false;
    }
    Serial.printf("DNS OK: %s → %s\n", s_cfg.mqttHost.c_str(),
                  resolvedIp.toString().c_str());

    if (WiFi.gatewayIP() == IPAddress(0, 0, 0, 0)) {
        Serial.println("No gateway — waiting for DHCP");
        return false;
    }

    s_mqtt.setKeepAlive(MQTT_KEEPALIVE_S);
    s_mqtt.setSocketTimeout(15);
    s_mqtt.setCallback(onMessage);

    String willTopic  = topic("status");
    const char* willPayload = "{\"online\":false}";

    bool ok = s_mqtt.connect(
        s_clientId.c_str(),
        s_cfg.mqttUser.length() ? s_cfg.mqttUser.c_str() : nullptr,
        s_cfg.mqttPass.length() ? s_cfg.mqttPass.c_str() : nullptr,
        willTopic.c_str(), 1, true, willPayload, true);

    if (ok) {
        Serial.printf("MQTT connected to %s:%u as %s\n",
                      s_cfg.mqttHost.c_str(), s_cfg.mqttPort, s_clientId.c_str());
        s_mqtt.subscribe(s_cmdSub.c_str(), 1);
        publishStatusJson("{\"online\":true}");
    } else {
        Serial.printf("MQTT connect failed rc=%d\n", s_mqtt.state());
    }
    return ok;
}

void begin(const Settings& s, CmdHandler h) {
    s_cfg     = s;
    s_handler = h;
    s_baseTopic = String("aquaguard/") + s.deviceId;
    s_clientId  = String("aquaguard-rx-") + s.deviceId + "-"
                  + String((uint32_t)ESP.getEfuseMac(), HEX);
    s_cmdSub    = s_baseTopic + "/cmd/#";

    // CHOOSE TLS OR PLAIN BASED ON PORTAL CONFIG.
    // s_cfg.mqttTls=1 → TLS over WiFiClientSecure (HiveMQ Cloud, etc.)
    // s_cfg.mqttTls=0 → plain TCP via WiFiClient (local Mosquitto on LAN)
    if (s_cfg.mqttTls) {
        s_tls.setInsecure();           // skip cert verification — fine for dev / HiveMQ
        s_tls.setTimeout(20);
        s_mqtt.setClient(s_tls);
        Serial.println("MQTT transport: TLS (WiFiClientSecure)");
    } else {
        s_mqtt.setClient(s_plain);
        Serial.println("MQTT transport: plain (WiFiClient)");
    }

    s_mqtt.setServer(s_cfg.mqttHost.c_str(), s_cfg.mqttPort);
    s_mqtt.setBufferSize(512);

    s_lastTry = 0;
}

void loop() {
    if (s_mqtt.connected()) { s_mqtt.loop(); return; }
    if (millis() - s_lastTry < MQTT_RECONNECT_MS) return;
    s_lastTry = millis();
    tryConnect();
}

bool connected() { return s_mqtt.connected(); }

static bool pub(const char* leaf, const char* json, bool retained) {
    if (!s_mqtt.connected()) return false;
    String t = topic(leaf);
    return s_mqtt.publish(t.c_str(), (const uint8_t*)json, strlen(json), retained);
}

bool publishTelemetryJson(const char* j) { return pub("telemetry", j, false); }
bool publishStatusJson   (const char* j) { return pub("status",    j, true ); }
bool publishAlertJson    (const char* j) { return pub("alert",     j, false); }
bool publishAckJson      (const char* j) { return pub("ack",       j, false); }

} // namespace mqtt_link
