#pragma once
#include <Arduino.h>
#include "settings.h"

namespace wifi_setup {
    // Connect with stored creds; if none, run blocking captive portal.
    // After return, WiFi is connected (or device has rebooted via portal).
    void autoConnect(Settings& s);

    // Forced (re-)provisioning: stop normal ops, run captive portal.
    void runPortal(Settings& s);

    // Call from loop(): detects long-press of BOOT button → runPortal().
    void pollButton(Settings& s);

    String apSsidFor(const String& deviceId);
}
