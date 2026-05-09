#include "storage.h"
#include "config.h"
#include <Preferences.h>

static Preferences prefs;
static const char* NS = "aqg";

namespace storage {

void begin() {
    prefs.begin(NS, false);
}

void loadAll(PhCal& ph, TurbCal& tu, TempCal& te, Thresholds& th) {
    ph.v7_mv        = prefs.getUShort("ph_v7",  DEF_PH_V7_MV);
    ph.v4_mv        = prefs.getUShort("ph_v4",  DEF_PH_V4_MV);
    ph.calibratedAt = prefs.getULong ("ph_t",   0);

    tu.v_clear_mv   = prefs.getUShort("tu_vc",  DEF_TURB_V_CLEAR_MV);
    tu.v_dirty_mv   = prefs.getUShort("tu_vd",  DEF_TURB_V_DIRTY_MV);
    tu.ntu_dirty    = prefs.getFloat ("tu_nd",  DEF_TURB_NTU_DIRTY);
    tu.calibratedAt = prefs.getULong ("tu_t",   0);

    te.offsetC      = prefs.getFloat ("te_off", 0.0f);
    te.calibratedAt = prefs.getULong ("te_t",   0);

    th.temp.warnLow  = prefs.getFloat("t_twl", DEF_TEMP_WARN_LOW);
    th.temp.warnHigh = prefs.getFloat("t_twh", DEF_TEMP_WARN_HIGH);
    th.temp.critLow  = prefs.getFloat("t_tcl", DEF_TEMP_CRIT_LOW);
    th.temp.critHigh = prefs.getFloat("t_tch", DEF_TEMP_CRIT_HIGH);

    th.ph.warnLow    = prefs.getFloat("t_pwl", DEF_PH_WARN_LOW);
    th.ph.warnHigh   = prefs.getFloat("t_pwh", DEF_PH_WARN_HIGH);
    th.ph.critLow    = prefs.getFloat("t_pcl", DEF_PH_CRIT_LOW);
    th.ph.critHigh   = prefs.getFloat("t_pch", DEF_PH_CRIT_HIGH);

    th.turb.warnLow  = -1e9f;
    th.turb.warnHigh = prefs.getFloat("t_uwh", DEF_TURB_WARN_HIGH);
    th.turb.critLow  = -1e9f;
    th.turb.critHigh = prefs.getFloat("t_uch", DEF_TURB_CRIT_HIGH);
}

void savePhCal(const PhCal& v) {
    prefs.putUShort("ph_v7", v.v7_mv);
    prefs.putUShort("ph_v4", v.v4_mv);
    prefs.putULong ("ph_t",  v.calibratedAt);
}

void saveTurbCal(const TurbCal& v) {
    prefs.putUShort("tu_vc", v.v_clear_mv);
    prefs.putUShort("tu_vd", v.v_dirty_mv);
    prefs.putFloat ("tu_nd", v.ntu_dirty);
    prefs.putULong ("tu_t",  v.calibratedAt);
}

void saveTempCal(const TempCal& v) {
    prefs.putFloat("te_off", v.offsetC);
    prefs.putULong("te_t",   v.calibratedAt);
}

void saveThresholds(const Thresholds& v) {
    prefs.putFloat("t_twl", v.temp.warnLow);
    prefs.putFloat("t_twh", v.temp.warnHigh);
    prefs.putFloat("t_tcl", v.temp.critLow);
    prefs.putFloat("t_tch", v.temp.critHigh);

    prefs.putFloat("t_pwl", v.ph.warnLow);
    prefs.putFloat("t_pwh", v.ph.warnHigh);
    prefs.putFloat("t_pcl", v.ph.critLow);
    prefs.putFloat("t_pch", v.ph.critHigh);

    prefs.putFloat("t_uwh", v.turb.warnHigh);
    prefs.putFloat("t_uch", v.turb.critHigh);
}

} // namespace storage
