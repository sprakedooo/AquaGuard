#include "storage.h"
#include "config.h"
#include <Preferences.h>

static Preferences prefs;
static const char* NS = "aqg";

namespace storage {

void begin() {
    prefs.begin(NS, false);
}

void loadAll(Thresholds& th) {
    th.temp.warnLow  = prefs.getFloat("t_twl", DEF_TEMP_WARN_LOW);
    th.temp.warnHigh = prefs.getFloat("t_twh", DEF_TEMP_WARN_HIGH);
    th.temp.critLow  = prefs.getFloat("t_tcl", DEF_TEMP_CRIT_LOW);
    th.temp.critHigh = prefs.getFloat("t_tch", DEF_TEMP_CRIT_HIGH);

    // pH and turbidity thresholds kept in NVS for possible future local use,
    // but alert evaluation for these is handled server-side.
    th.ph.warnLow    = prefs.getFloat("t_pwl", DEF_PH_WARN_LOW);
    th.ph.warnHigh   = prefs.getFloat("t_pwh", DEF_PH_WARN_HIGH);
    th.ph.critLow    = prefs.getFloat("t_pcl", DEF_PH_CRIT_LOW);
    th.ph.critHigh   = prefs.getFloat("t_pch", DEF_PH_CRIT_HIGH);

    th.turb.warnLow  = -1e9f;
    th.turb.warnHigh = prefs.getFloat("t_uwh", DEF_TURB_WARN_HIGH);
    th.turb.critLow  = -1e9f;
    th.turb.critHigh = prefs.getFloat("t_uch", DEF_TURB_CRIT_HIGH);
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

void purgeLegacyTempCal() {
    // Remove old keys from when the device applied a temperature offset locally.
    // Preferences.remove() is a no-op if the key doesn't exist, so this is safe
    // on freshly-flashed boards too.
    prefs.remove("te_off");
    prefs.remove("te_t");
}

} // namespace storage
