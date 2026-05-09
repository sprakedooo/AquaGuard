#pragma once
#include <Arduino.h>
#include "packet.h"

namespace lora_link {
    bool begin();

    // Send a pre-encoded packet over LoRa. Switches to TX, sends, returns to RX.
    bool send(const uint8_t* data, size_t len);

    // Convenience wrappers.
    bool sendTelemetry(uint8_t seq, const pkt::Telemetry& t);
    bool sendAck      (uint8_t seq, uint8_t refMsgType, uint8_t status);

    // Pump the RX path. Call from loop(). Invokes onDownlink() for each valid frame.
    void poll();

    typedef void (*DownlinkHandler)(uint8_t msgType, uint8_t seq,
                                    const uint8_t* payload, uint8_t payloadLen);
    void onDownlink(DownlinkHandler h);
}
