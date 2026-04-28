const AudioSys = {
            bgm: null,
            playBGM: (src) => {
                if(AudioSys.bgm) { AudioSys.bgm.pause(); AudioSys.bgm.currentTime = 0; }
                AudioSys.bgm = new Audio(src);
                AudioSys.bgm.loop = true;
                AudioSys.bgm.volume = 0.5;
                AudioSys.bgm.play().catch(e => console.log('BGM Auto-play blocked', e));
            },
            playSFX: (src) => {
                let sfx = new Audio(src); 
                sfx.volume = 0.8;
                sfx.play().catch(e => {}); 
            },
            stopBGM: () => {
                if(AudioSys.bgm) AudioSys.bgm.pause();
            }
        };
