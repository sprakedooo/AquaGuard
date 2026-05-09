#include "packet.h"

namespace pkt {

uint16_t crc16_ccitt(const uint8_t* data, size_t len) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < len; ++i) {
        crc ^= (uint16_t)data[i] << 8;
        for (int b = 0; b < 8; ++b) {
            crc = (crc & 0x8000) ? (uint16_t)((crc << 1) ^ 0x1021) : (uint16_t)(crc << 1);
        }
    }
    return crc;
}

size_t encode(uint8_t msgType, uint8_t seq, const uint8_t* payload, uint8_t payloadLen,
              uint8_t* out, size_t outCap) {
    size_t total = 3 + payloadLen + 2;
    if (total > outCap) return 0;
    out[0] = msgType;
    out[1] = seq;
    out[2] = payloadLen;
    if (payloadLen && payload) memcpy(&out[3], payload, payloadLen);
    uint16_t crc = crc16_ccitt(out, 3 + payloadLen);
    out[3 + payloadLen]     = (uint8_t)(crc >> 8);
    out[3 + payloadLen + 1] = (uint8_t)(crc & 0xFF);
    return total;
}

bool decode(const uint8_t* in, size_t inLen,
            uint8_t& msgType, uint8_t& seq,
            const uint8_t*& payload, uint8_t& payloadLen) {
    if (inLen < 5) return false;
    uint8_t len = in[2];
    if ((size_t)(3 + len + 2) != inLen) return false;
    uint16_t got = ((uint16_t)in[3 + len] << 8) | in[3 + len + 1];
    uint16_t want = crc16_ccitt(in, 3 + len);
    if (got != want) return false;
    msgType    = in[0];
    seq        = in[1];
    payloadLen = len;
    payload    = (len ? &in[3] : nullptr);
    return true;
}

size_t encodeTelemetry(uint8_t seq, const Telemetry& t, uint8_t* out, size_t outCap) {
    uint8_t p[12];
    p[0]  = (uint8_t)(t.tempC_x100 >> 8);
    p[1]  = (uint8_t)(t.tempC_x100 & 0xFF);
    p[2]  = (uint8_t)(t.pH_x100 >> 8);
    p[3]  = (uint8_t)(t.pH_x100 & 0xFF);
    p[4]  = (uint8_t)(t.turbNTU_x10 >> 8);
    p[5]  = (uint8_t)(t.turbNTU_x10 & 0xFF);
    p[6]  = t.alertLevel;
    p[7]  = t.flags;
    p[8]  = (uint8_t)(t.pH_mv >> 8);
    p[9]  = (uint8_t)(t.pH_mv & 0xFF);
    p[10] = (uint8_t)(t.turb_mv >> 8);
    p[11] = (uint8_t)(t.turb_mv & 0xFF);
    return encode(MSG_TELEMETRY, seq, p, sizeof(p), out, outCap);
}

} // namespace pkt
