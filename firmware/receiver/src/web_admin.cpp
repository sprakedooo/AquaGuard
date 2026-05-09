#include "web_admin.h"
#include "config.h"
#include <WiFi.h>
#include <WebServer.h>

static WebServer s_server(80);
static Settings* s_settings = nullptr;
static web_admin::Status s_status{};

static String htmlEscape(const String& v) {
    String s; s.reserve(v.length());
    for (size_t i = 0; i < v.length(); ++i) {
        char c = v[i];
        switch (c) {
            case '&': s += "&amp;";  break;
            case '<': s += "&lt;";   break;
            case '>': s += "&gt;";   break;
            case '"': s += "&quot;"; break;
            default:  s += c;
        }
    }
    return s;
}

static String renderIndex() {
    const Settings& s = *s_settings;
    uint32_t since = (millis() - s_status.lastSeenMs) / 1000;
    String html;
    html.reserve(2048);
    html += F("<!doctype html><html><head><meta charset=utf-8>"
              "<meta name=viewport content='width=device-width,initial-scale=1'>"
              "<title>AquaGuard Receiver</title>"
              "<style>body{font-family:system-ui;margin:1.5rem;max-width:720px}"
              "h1{margin:0 0 .25rem}h2{margin-top:1.5rem}"
              "label{display:block;margin:.5rem 0 .15rem}"
              "input[type=text],input[type=password],input[type=number]{width:100%;padding:.4rem;box-sizing:border-box}"
              ".row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}"
              ".card{border:1px solid #ddd;border-radius:8px;padding:1rem;margin-top:1rem}"
              ".badge{display:inline-block;padding:.15rem .5rem;border-radius:999px;font-size:.85rem;color:#fff}"
              ".ok{background:#2a8}.warn{background:#e90}.crit{background:#c33}.off{background:#888}"
              "button{padding:.5rem 1rem;margin-top:.75rem;cursor:pointer}"
              ".danger{background:#c33;color:#fff;border:0}</style></head><body>");
    html += F("<h1>AquaGuard Receiver</h1>");
    html += "<div>Firmware " FIRMWARE_VERSION " &middot; IP " + WiFi.localIP().toString()
         +  " &middot; RSSI " + String(WiFi.RSSI()) + " dBm</div>";

    const char* alertCls  = "off";
    const char* alertText = "no data";
    if (s_status.lastSeenMs) {
        switch (s_status.lastAlert) {
            case 0: alertCls = "ok";   alertText = "normal";   break;
            case 1: alertCls = "warn"; alertText = "warning";  break;
            case 2: alertCls = "crit"; alertText = "critical"; break;
        }
    }

    html += F("<div class=card><h2>Live</h2>");
    html += "<p>Status: <span class='badge "; html += alertCls; html += "'>";
    html += alertText; html += "</span> &middot; MQTT: ";
    html += (s_status.mqttConnected ? "connected" : "disconnected");
    html += "</p>";
    if (s_status.lastSeenMs) {
        html += "<p>Temp: <b>" + String(s_status.lastTempC, 2) + " &deg;C</b><br>";
        html += "pH: <b>" + String(s_status.lastPh, 2) + "</b><br>";
        html += "Turbidity: <b>" + String(s_status.lastTurbNTU, 1) + " NTU</b><br>";
        html += "RSSI/SNR: " + String(s_status.lastRssi) + " dBm / " + String(s_status.lastSnr, 1) + " dB<br>";
        html += "Last uplink: " + String(since) + " s ago</p>";
    } else {
        html += "<p><i>Waiting for first telemetry from transmitter…</i></p>";
    }
    html += "</div>";

    html += F("<div class=card><h2>Settings</h2><form method=POST action='/save'>");
    html += "<label>Device ID</label><input type=text name=device_id value='" + htmlEscape(s.deviceId) + "'>";
    html += "<div class=row>";
    html += "<div><label>MQTT Host</label><input type=text name=mqtt_host value='" + htmlEscape(s.mqttHost) + "'></div>";
    html += "<div><label>MQTT Port</label><input type=number name=mqtt_port value='" + String(s.mqttPort) + "'></div>";
    html += "</div><div class=row>";
    html += "<div><label>MQTT User</label><input type=text name=mqtt_user value='" + htmlEscape(s.mqttUser) + "'></div>";
    html += "<div><label>MQTT Password</label><input type=password name=mqtt_pass value='" + htmlEscape(s.mqttPass) + "'></div>";
    html += "</div>";
    html += "<label><input type=checkbox name=mqtt_tls ";
    html += (s.mqttTls ? "checked" : "");
    html += "> Use TLS</label>";
    html += F("<button type=submit>Save &amp; Reboot</button></form></div>");

    html += F("<div class=card><h2>Maintenance</h2>"
              "<form method=POST action='/wifi'><button>Re-run WiFi setup portal</button></form>"
              "<form method=POST action='/reset' onsubmit=\"return confirm('Wipe all settings?')\">"
              "<button class=danger>Factory reset</button></form></div>");

    html += F("<script>setTimeout(()=>location.reload(),5000)</script></body></html>");
    return html;
}

static void handleIndex() { s_server.send(200, "text/html; charset=utf-8", renderIndex()); }

static void handleSave() {
    Settings& s = *s_settings;
    if (s_server.hasArg("device_id")) s.deviceId = s_server.arg("device_id");
    if (s_server.hasArg("mqtt_host")) s.mqttHost = s_server.arg("mqtt_host");
    if (s_server.hasArg("mqtt_port")) s.mqttPort = (uint16_t)s_server.arg("mqtt_port").toInt();
    if (s_server.hasArg("mqtt_user")) s.mqttUser = s_server.arg("mqtt_user");
    if (s_server.hasArg("mqtt_pass")) s.mqttPass = s_server.arg("mqtt_pass");
    s.mqttTls = s_server.hasArg("mqtt_tls");
    if (s.mqttPort == 0) s.mqttPort = 1883;
    settings::save(s);
    s_server.send(200, "text/html", "Saved. Rebooting…");
    delay(500);
    ESP.restart();
}

static void handleWifi() {
    s_server.send(200, "text/html", "Entering AP setup. Connect to '" AP_SSID_PREFIX "-…'");
    delay(500);
    // Trigger by clearing WiFi creds and rebooting (WiFiManager picks up at boot).
    WiFi.disconnect(true, true);
    delay(200);
    ESP.restart();
}

static void handleReset() {
    settings::factoryReset();
    WiFi.disconnect(true, true);
    s_server.send(200, "text/html", "Factory reset. Rebooting…");
    delay(500);
    ESP.restart();
}

namespace web_admin {

void begin(Settings& s) {
    s_settings = &s;
    s_server.on("/",       HTTP_GET,  handleIndex);
    s_server.on("/save",   HTTP_POST, handleSave);
    s_server.on("/wifi",   HTTP_POST, handleWifi);
    s_server.on("/reset",  HTTP_POST, handleReset);
    s_server.begin();
    Serial.printf("Admin UI: http://%s/\n", WiFi.localIP().toString().c_str());
}

void loop() { s_server.handleClient(); }

void updateStatus(const Status& st) { s_status = st; }

} // namespace web_admin
