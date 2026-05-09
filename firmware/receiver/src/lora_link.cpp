#include "lora_link.h"
#include "config.h"
#include <SPI.h>
#include <LoRa.h>

static lora_link::UplinkHandler s_handler = nullptr;
static uint8_t s_dlSeq = 0;

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
    LoRa.receive();
    return true;
}

void onUplink(UplinkHandler h) { s_handler = h; }

bool sendRaw(const uint8_t* data, size_t len) {
    if (!data || !len || len > LORA_MAX_PAYLOAD) return false;
    LoRa.idle();
    LoRa.beginPacket();
    LoRa.write(data, len);
    bool ok = (LoRa.endPacket() == 1);
    LoRa.receive();
    return ok;
}

bool sendDownlink(uint8_t msgType, const uint8_t* payload, uint8_t plen) {
    uint8_t buf[LORA_MAX_PAYLOAD];
    size_t n = pkt::encode(msgType, s_dlSeq++, payload, plen, buf, sizeof(buf));
    if (!n) return false;
    return sendRaw(buf, n);
}

void poll() {
    int sz = LoRa.parsePacket();
    if (sz <= 0) return;

    uint8_t buf[LORA_MAX_PAYLOAD];
    int idx = 0;
    while (LoRa.available() && idx < (int)sizeof(buf)) buf[idx++] = (uint8_t)LoRa.read();

    UplinkMeta m{};
    m.rssi = LoRa.packetRssi();
    m.snr  = LoRa.packetSnr();

    uint8_t msgType, seq, plen;
    const uint8_t* payload = nullptr;
    if (!pkt::decode(buf, idx, msgType, seq, payload, plen)) return;
    m.msgType = msgType;
    m.seq     = seq;
    if (s_handler) s_handler(m, payload, plen);
}

} // namespace lora_link
