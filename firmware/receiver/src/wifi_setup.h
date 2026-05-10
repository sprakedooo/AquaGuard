#pragma once
#include <Arduino.h>
#include "settings.h"

namespace wifi_setup {
    // Connect with stored creds; if none, run blocking captive portal.
    // After return, WiFi is connected (or device has rebooted via portal).
    void autoConnect(Settings& s);

    // Forced (re-)provisioning: stop normal ops, run captive portal.
    void runPortal(Settings& s);

    // Check (and clear) the NVS "run portal on next boot" flag.
    // Call once in setup() BEFORE autoConnect(); if true, call runPortal() instead.
    bool portalRequestedAtBoot();

    // Call from loop(): detects long-press of BOOT button.
    // On long-press, sets NVS flag and reboots so portal runs before any web server.
    void pollButton(Settings& s);

    String apSsidFor(const String& deviceId);
}
