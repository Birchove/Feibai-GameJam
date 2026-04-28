const DragSys = {
            cardEl: null, cardData: null, index: -1, isDragging: false, startPt: {x:0, y:0}, currPt: {x:0, y:0},
            ctx: $('fxCanvas').getContext('2d'), paths: [],
            start: (e, el, cd, idx) => {
                DragSys.isDragging = true; DragSys.cardEl = el; DragSys.cardData = cd; DragSys.index = idx;
                DragSys.startPt = { x: e.clientX, y: e.clientY }; DragSys.currPt = { ...DragSys.startPt };
                const rect = el.getBoundingClientRect();
                el.classList.add('dragging'); el.style.position = 'fixed';
                el.style.left = `${rect.left}px`; el.style.top = `${rect.top}px`;
                document.onmousemove = DragSys.move; document.onmouseup = DragSys.end;
                document.ontouchmove = (ev) => DragSys.move(ev.touches[0]); document.ontouchend = DragSys.end;
            },
            move: (e) => {
                if(!DragSys.isDragging) return;
                const dx = e.clientX - DragSys.startPt.x; const dy = e.clientY - DragSys.startPt.y;
                DragSys.cardEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx*0.05}deg)`;
                DragSys.paths.push({ x: e.clientX, y: e.clientY, life: 1.0 }); DragSys.currPt = { x: e.clientX, y: e.clientY };
            },
            end: (e) => {
                if(!DragSys.isDragging) return;
                DragSys.isDragging = false; document.onmousemove = null; document.onmouseup = null; document.ontouchmove = null; document.ontouchend = null;
                const el = DragSys.cardEl; el.classList.remove('dragging');
                const inHitZone = DragSys.currPt.y < window.innerHeight * 0.6; 
                
                const cd = DragSys.cardData;
                if(inHitZone && State.energy >= cd.cost && State.combat.isPlayerTurn && !State.combat.player.cantPlay) { 
                    el.style.display = 'none'; 
                    Combat.playCard(DragSys.index); 
                } else {
                    if (inHitZone) Game.showToast("无法打出此牌");
                    el.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    el.style.transform = 'translate(0, 0) rotate(0)';
                    setTimeout(() => { el.style.position = 'relative'; el.style.left='0'; el.style.top='0'; el.style.transition=''; }, 300);
                }
            },
            drawFx: () => {
                const ctx = DragSys.ctx; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                if(DragSys.paths.length > 1) {
                    ctx.beginPath(); ctx.moveTo(DragSys.paths[0].x, DragSys.paths[0].y);
                    for(let i=1; i<DragSys.paths.length; i++) {
                        const p = DragSys.paths[i]; ctx.lineTo(p.x, p.y); p.life -= 0.05; 
                    }
                    ctx.strokeStyle = `rgba(100, 100, 100, 0.5)`; ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
                    DragSys.paths = DragSys.paths.filter(p => p.life > 0);
                }
                requestAnimationFrame(DragSys.drawFx);
            }
        };

        function resize() { $('bgCanvas').width = $('fxCanvas').width = window.innerWidth; $('bgCanvas').height = $('fxCanvas').height = window.innerHeight; }
        window.addEventListener('resize', resize); resize(); DragSys.drawFx(); 

        const bgCtx = $('bgCanvas').getContext('2d');
        const bgParticles = Array.from({length: 40}, () => ({ x: rand(0, window.innerWidth), y: rand(0, window.innerHeight), r: rand(10, 80), vx: rand(-2, 2)*0.1, vy: rand(-2, 2)*0.1, a: rand(1, 5)*0.01 }));
        function drawBg() {
            bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            bgParticles.forEach(p => {
                bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.r, 0, Math.PI*2); bgCtx.fillStyle = `rgba(200, 200, 200, ${p.a})`; bgCtx.fill();
                p.x += p.vx; p.y += p.vy;
                if(p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
                if(p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
            });
            requestAnimationFrame(drawBg);
        }
        drawBg();
