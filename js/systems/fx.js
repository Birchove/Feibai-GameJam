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
                if (typeof Combat !== 'undefined' && Combat.clearDragBattleHint) Combat.clearDragBattleHint();
            },
            move: (e) => {
                if(!DragSys.isDragging) return;
                const dx = e.clientX - DragSys.startPt.x; const dy = e.clientY - DragSys.startPt.y;
                DragSys.cardEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx*0.05}deg)`;
                DragSys.paths.push({ x: e.clientX, y: e.clientY, life: 1.0 }); DragSys.currPt = { x: e.clientX, y: e.clientY };
                if (typeof Combat !== 'undefined' && Combat.updateDragBattleHint) Combat.updateDragBattleHint(DragSys.cardData, DragSys.currPt);
            },
            end: (e) => {
                if(!DragSys.isDragging) return;
                DragSys.isDragging = false; document.onmousemove = null; document.onmouseup = null; document.ontouchmove = null; document.ontouchend = null;
                if (typeof hideKeywordTooltip === 'function') hideKeywordTooltip();
                if (typeof Combat !== 'undefined' && Combat.clearDragBattleHint) Combat.clearDragBattleHint();
                const el = DragSys.cardEl; el.classList.remove('dragging');
                const inHitZone = DragSys.currPt.y < window.innerHeight * 0.6; 
                
                const cd = DragSys.cardData;
                if (cd.unplayable) {
                    Game.showToast('此牌不可打出');
                    el.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    el.style.transform = 'translate(0, 0) rotate(0)';
                    setTimeout(() => { el.style.position = 'relative'; el.style.left = '0'; el.style.top = '0'; el.style.transition = ''; }, 300);
                    return;
                }
                // 取手牌项的有效 cost(镜像等可能通过 costOverride 使其为 0)
                const handItemRaw = (State.combat && State.combat.hand) ? State.combat.hand[DragSys.index] : null;
                const handItem = handItemRaw ? (typeof handItemRaw === 'string' ? { cardId: handItemRaw } : handItemRaw) : null;
                const effCost = (handItem && handItem.costOverride !== undefined) ? handItem.costOverride : cd.cost;
                const canAfford = State.combat && State.combat.inCombat && State.energy >= effCost && State.combat.isPlayerTurn && !State.combat.player.cantPlay;
                const c35ok = cd.id !== 'c35' || State.combat.hand.length >= 2;
                if(inHitZone && canAfford && c35ok) { 
                    let hitIdx = -1;
                    if (State.combat.enemies && State.combat.enemies.length) {
                        State.combat.enemies.forEach((en, i) => {
                            if (!en || en.hp <= 0) return;
                            const slot = document.getElementById(`enemy-slot-${i}`);
                            if (!slot) return;
                            const r = slot.getBoundingClientRect();
                            if (DragSys.currPt.x >= r.left && DragSys.currPt.x <= r.right && DragSys.currPt.y >= r.top && DragSys.currPt.y <= r.bottom) hitIdx = i;
                        });
                    }
                    const liv = (typeof Combat !== 'undefined' && Combat._livingIndices) ? Combat._livingIndices() : [];
                    const needTgt = typeof Combat !== 'undefined' && Combat.cardNeedsEnemyTarget && Combat.cardNeedsEnemyTarget(cd);
                    if (needTgt && liv.length > 1 && hitIdx < 0) {
                        Game.showToast('请将攻势拖到敌影之上');
                        el.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        el.style.transform = 'translate(0, 0) rotate(0)';
                        setTimeout(() => { el.style.position = 'relative'; el.style.left='0'; el.style.top='0'; el.style.transition=''; }, 300);
                        return;
                    }
                    if (hitIdx < 0) {
                        hitIdx = (typeof Combat !== 'undefined' && Combat._primaryTargetIdx) ? Combat._primaryTargetIdx() : 0;
                    }
                    State.combat.selectedTargetIndex = hitIdx;
                    el.style.display = 'none'; 
                    Combat.playCard(DragSys.index); 
                } else {
                    if (inHitZone && cd.id === 'c35' && !c35ok) Game.showToast('付之一炬：须另有一张可焚之牌');
                    else if (inHitZone) Game.showToast("无法打出此牌");
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

        // 诗韵触发特效(DOM 覆盖层，独立于 fxCanvas，避免被 DragSys 帧清屏)
        const Fx = {
            poetryBurst: (text, variant = 'blade') => {
                if (!text) return;
                const v = variant === 'tear' ? 'tear' : 'blade';
                const overlay = document.createElement('div');
                overlay.className = `poetry-burst poetry-burst--${v}`;

                if (v === 'blade') {
                    const ring = document.createElement('div');
                    ring.className = 'poetry-burst-ring';
                    overlay.appendChild(ring);
                    const ringInner = document.createElement('div');
                    ringInner.className = 'poetry-burst-ring inner';
                    overlay.appendChild(ringInner);
                } else {
                    const drip = document.createElement('div');
                    drip.className = 'poetry-burst-drip-root';
                    for (let j = 0; j < 5; j++) {
                        const d = document.createElement('div');
                        d.className = 'poetry-burst-drop';
                        d.style.animationDelay = `${j * 0.06}s`;
                        drip.appendChild(d);
                    }
                    overlay.appendChild(drip);
                }

                Array.from(text).forEach((ch, i) => {
                    const span = document.createElement('span');
                    span.className = `poetry-burst-char poetry-burst-char--${v}`;
                    span.textContent = ch;
                    span.style.animationDelay = `${i * (v === 'tear' ? 0.1 : 0.08)}s`;
                    overlay.appendChild(span);
                });

                document.body.appendChild(overlay);
                setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, v === 'tear' ? 1650 : 1400);
            }
        };

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
