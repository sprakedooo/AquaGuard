#include "mqtt_link.h"
#include "config.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

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
    // topic: aquaguard/{id}/cmd/<sub...>
    String t(topic);
    int idx = t.indexOf("/cmd/");
    if (idx < 0 || !s_handler) return;
    String sub = t.substring(idx + 5);
    s_handler(sub.c_str(), payload, len);
}

namespace mqtt_link {

String topic(const char* leaf) { return s_baseTopic + "/" + leaf; }

static bool tryConnect() {
    if (WiFi.status() != WL_CONNECTED) return false;
    if (s_cfg.mqttHost.length() == 0)  return false;

    s_mqtt.setServer(s_cfg.mqttHost.c_str(), s_cfg.mqttPort);
    s_mqtt.setKeepAlive(MQTT_KEEPALIVE_S);
    s_mqtt.setBufferSize(MQTT_MAX_PACKET_SIZE);
    s_mqtt.setCallback(onMessage);

    String willTopic = topic("status");
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
    s_clientId  = String("aquaguard-rx-") + s.deviceId + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    s_cmdSub    = s_baseTopic + "/cmd/#";

    if (s.mqttTls) { s_tls.setInsecure(); s_mqtt.setClient(s_tls); }
    else           { s_mqtt.setClient(s_plain); }

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
