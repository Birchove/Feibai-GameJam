const PreloadSys = {
    _started: false,
    _audioKeepAlive: [],

    CRITICAL_IMAGES: [
        "./assets/main_menu_bg.png",
        "./assets/saves_menu_bg.png",
        "./assets/class_select_bg.png",
        "./assets/map_bg.png",
        "./assets/combat_bg.png",
        "./assets/portrait_combat.png",
        "./assets/portrait_info.png"
    ],

    CRITICAL_AUDIO: [
        "./assets/bgm_world.mp3",
        "./assets/bgm_combat.mp3",
        "./assets/bgm_boss.mp3"
    ],

    _warmImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.decoding = "async";
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
        });
    },

    _warmAudio(src) {
        try {
            const audio = new Audio();
            audio.preload = "auto";
            audio.src = src;
            audio.load();
            PreloadSys._audioKeepAlive.push(audio);
        } catch (e) {
            // Ignore preload failures to avoid blocking gameplay.
        }
    },

    start() {
        if (PreloadSys._started) return;
        PreloadSys._started = true;

        const run = () => {
            PreloadSys.CRITICAL_IMAGES.forEach((src) => {
                PreloadSys._warmImage(src);
            });
            PreloadSys.CRITICAL_AUDIO.forEach((src) => {
                PreloadSys._warmAudio(src);
            });
        };

        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(run, { timeout: 1200 });
        } else {
            setTimeout(run, 0);
        }
    }
};

window.PreloadSys = PreloadSys;
