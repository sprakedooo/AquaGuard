#pragma once
#include <Arduino.h>

// Packet wire format (must match transmitter):
//   [0] msgType  [1] seq  [2] len  [3..] payload  [-2..-1] CRC16-CCITT BE

namespace pkt {

enum MsgType : uint8_t {
    MSG_TELEMETRY        = 0x01,
    MSG_STATUS           = 0x02,
    MSG_ACK              = 0x03,
    MSG_CAL_PH           = 0x10,
    MSG_CAL_TURB         = 0x11,
    MSG_CAL_TEMP_OFFSET  = 0x12,
    MSG_SET_THRESHOLD    = 0x20,
    MSG_REBOOT           = 0x30,
};

enum AlertLevel : uint8_t {
    ALERT_NORMAL   = 0,
    ALERT_WARNING  = 1,
    ALERT_CRITICAL = 2,
};

struct Telemetry {
    int16_t  tempC_x100;
    uint16_t pH_x100;
    uint16_t turbNTU_x10;
    uint8_t  alertLevel;
    uint8_t  flags;
    uint16_t pH_mv;
    uint16_t turb_mv;
};

uint16_t crc16_ccitt(const uint8_t* data, size_t len);

size_t encode(uint8_t msgType, uint8_t seq, const uint8_t* payload, uint8_t payloadLen,
              uint8_t* out, size_t outCap);
bool   decode(const uint8_t* in, size_t inLen,
              uint8_t& msgType, uint8_t& seq,
              const uint8_t*& payload, uint8_t& payloadLen);

bool decodeTelemetry(const uint8_t* payload, uint8_t plen, Telemetry& out);

} // namespace pkt
