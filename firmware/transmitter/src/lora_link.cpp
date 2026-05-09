#include "lora_link.h"
#include "config.h"
#include <SPI.h>
#include <LoRa.h>

static lora_link::DownlinkHandler s_handler = nullptr;

namespace lora_link {

bool begin() {
    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
    LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
    if (!LoRa.begin(LORA_FREQ_HZ)) return false;

    LoRa.setSpreadingFactor(LORA_SPREADING);
    LoRa.setSignalBandwidth(LORA_BANDWIDTH);
    LoRa.setCodingRate4(LORA_CODING_RATE);
    LoRa.setSyncWord(LORA_SYNC_WORD);
    LoRa.setPreambleLength(LORA_PREAMBLE_LEN);
    LoRa.setTxPower(LORA_TX_POWER_DBM);
    LoRa.enableCrc();
    LoRa.receive();   // start in RX
    return true;
}

bool send(const uint8_t* data, size_t len) {
    if (!data || len == 0 || len > LORA_MAX_PAYLOAD) return false;
    LoRa.idle();
    LoRa.beginPacket();
    LoRa.write(data, len);
    bool ok = (LoRa.endPacket() == 1);
    LoRa.receive();
    return ok;
}

bool sendTelemetry(uint8_t seq, const pkt::Telemetry& t) {
    uint8_t buf[LORA_MAX_PAYLOAD];
    size_t n = pkt::encodeTelemetry(seq, t, buf, sizeof(buf));
    if (!n) return false;
    return send(buf, n);
}

bool sendAck(uint8_t seq, uint8_t refMsgType, uint8_t status) {
    uint8_t payload[2] = { refMsgType, status };
    uint8_t buf[LORA_MAX_PAYLOAD];
    size_t n = pkt::encode(pkt::MSG_ACK, seq, payload, sizeof(payload), buf, sizeof(buf));
    if (!n) return false;
    return send(buf, n);
}

void onDownlink(DownlinkHandler h) { s_handler = h; }

void poll() {
    int sz = LoRa.parsePacket();
    if (sz <= 0) return;

    uint8_t buf[LORA_MAX_PAYLOAD];
    int idx = 0;
    while (LoRa.available() && idx < (int)sizeof(buf)) buf[idx++] = (uint8_t)LoRa.read();

    uint8_t msgType, seq, plen;
    const uint8_t* payload = nullptr;
    if (!pkt::decode(buf, idx, msgType, seq, payload, plen)) return;
    if (s_handler) s_handler(msgType, seq, payload, plen);
}

} // namespace lora_link
