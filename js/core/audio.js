const AudioSys = {
    /**
     * 三类 BGM 资产路径(与 `assets/` 下文件名一致；地图与事件共用 WORLD)
     */
    BGM: {
        world: './assets/bgm_world.mp3',
        combat: './assets/bgm_combat.mp3',
        boss: './assets/bgm_boss.mp3'
    },

    /** 当前循环曲类别，用于同曲不重复重头播放 */
    _bgmTrack: null,

    bgm: null,

    playBGM: (src) => {
        AudioSys._bgmTrack = null;
        if (AudioSys.bgm) { AudioSys.bgm.pause(); AudioSys.bgm.currentTime = 0; }
        AudioSys.bgm = new Audio(src);
        AudioSys.bgm.loop = true;
        AudioSys.bgm.volume = 0.5;
        AudioSys.bgm.play().catch(() => {});
    },

    /**
     * @param {'world'|'combat'|'boss'} track
     */
    playBGMTrack: (track) => {
        const src = AudioSys.BGM[track];
        if (!src) return;
        if (AudioSys._bgmTrack === track) return;
        AudioSys._bgmTrack = track;
        if (AudioSys.bgm) { AudioSys.bgm.pause(); AudioSys.bgm.currentTime = 0; }
        AudioSys.bgm = new Audio(src);
        AudioSys.bgm.loop = true;
        AudioSys.bgm.volume = 0.5;
        AudioSys.bgm.play().catch(() => {});
    },

    playSFX: (src) => {
        const sfx = new Audio(src);
        sfx.volume = 0.8;
        sfx.play().catch(e => {});
    },
    stopBGM: () => {
        AudioSys._bgmTrack = null;
        if (AudioSys.bgm) AudioSys.bgm.pause();
    }
};
