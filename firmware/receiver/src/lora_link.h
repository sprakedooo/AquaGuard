#pragma once
#include <Arduino.h>
#include "packet.h"

namespace lora_link {
    bool begin();
    void poll();   // call frequently

    // Send a downlink packet to the transmitter (already-encoded).
    bool sendRaw(const uint8_t* data, size_t len);

    // Build & send a typed downlink (encodes envelope).
    bool sendDownlink(uint8_t msgType, const uint8_t* payload, uint8_t plen);

    struct UplinkMeta { int rssi; float snr; uint8_t msgType; uint8_t seq; };

    typedef void (*UplinkHandler)(const UplinkMeta& meta,
                                  const uint8_t* payload, uint8_t plen);
    void onUplink(UplinkHandler h);
}
