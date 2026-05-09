#pragma once
#include <Arduino.h>

// Variable-length packet:
//   [0] msgType
//   [1] seq
//   [2] len  (payload bytes)
//   [3..3+len-1] payload
//   [3+len, 3+len+1] CRC16-CCITT (over bytes [0 .. 3+len-1])

namespace pkt {

enum MsgType : uint8_t {
    // uplink
    MSG_TELEMETRY        = 0x01,
    MSG_STATUS           = 0x02,
    MSG_ACK              = 0x03,

    // downlink
    MSG_CAL_PH           = 0x10,  // payload: [point u8] [voltage_mv u16]
    MSG_CAL_TURB         = 0x11,  // payload: [point u8] [voltage_mv u16] [ntu_x10 u16]
    MSG_CAL_TEMP_OFFSET  = 0x12,  // payload: [offset_c100 i16]
    MSG_SET_THRESHOLD    = 0x20,  // payload: [var u8] [4× value*100 i16]  var: 0=temp,1=ph,2=turb(*10)
    MSG_REBOOT           = 0x30,
};

enum AlertLevel : uint8_t {
    ALERT_NORMAL   = 0,
    ALERT_WARNING  = 1,
    ALERT_CRITICAL = 2,
};

// Telemetry payload (12 bytes)
struct Telemetry {
    int16_t  tempC_x100;     // °C × 100
    uint16_t pH_x100;        // pH × 100
    uint16_t turbNTU_x10;    // NTU × 10
    uint8_t  alertLevel;
    uint8_t  flags;          // bit0 tempBad, bit1 phBad, bit2 turbBad, bit3 sensorFault
    uint16_t pH_mv;          // raw probe voltage, for calibration wizard
    uint16_t turb_mv;
};

uint16_t crc16_ccitt(const uint8_t* data, size_t len);

// Encode/decode. Returns total bytes written, 0 on failure.
size_t encode(uint8_t msgType, uint8_t seq, const uint8_t* payload, uint8_t payloadLen,
              uint8_t* out, size_t outCap);
bool   decode(const uint8_t* in, size_t inLen,
              uint8_t& msgType, uint8_t& seq,
              const uint8_t*& payload, uint8_t& payloadLen);

size_t encodeTelemetry(uint8_t seq, const Telemetry& t, uint8_t* out, size_t outCap);

} // namespace pkt
