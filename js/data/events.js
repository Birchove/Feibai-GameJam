// Map nodes and event data
const MapNodes = [
                { id: 0, x: 10, y: 80, name: '望乡台', type: 'big', icon: '🪨', ev: 'vn1' },
                { id: 1, x: 30, y: 50, name: '山路', type: 'normal', icon: '⛰️', ev: 'fight1' },
                { id: 2, x: 45, y: 70, name: '山路', type: 'normal', icon: '⛰️', ev: 'fight2' },
                { id: 3, x: 65, y: 40, name: '茶楼', type: 'normal', icon: '🏯', ev: 'vn2' },
                { id: 4, x: 80, y: 60, name: '破庙', type: 'normal', icon: '🏚️', ev: 'vn3' },
                { id: 5, x: 90, y: 20, name: '奈何桥', type: 'big', icon: '🌉', ev: 'end' }
            ];

const Events = {
            vn1: { name: '我', texts: ['似乎有些记忆……', '想起了些什么……', '好像是……被杀了……', '我要杀出……阎王殿……'], opts: [] },
            vn2: { name: '冥府茶楼店小二', texts: ['小店……恭迎……客官……\n有何……吩咐？'], opts: [
                { text: '歇息一会 (回复35%已损生命)', cb: () => { const heal = Math.floor((State.maxHp-State.hp)*0.35); Combat.heal(heal); } },
                { text: '活动筋骨 (支付100钱，删一张牌 - 暂未实装)', cb: () => Game.showToast('功能开发中') },
                { text: '凑凑热闹 (获得卡牌“破阵子”)', cb: () => { State.deck.push('c6'); Game.showToast('获得 破阵子'); } }
            ]},
            vn3: { name: '我', texts: ['破庙中心有一尊小佛像', '要做些什么？'], opts: [
                { text: '不去碰他，只是歇脚 (回复7生命)', cb: () => Combat.heal(7) },
                { text: '拿走佛像 (受20伤，获得佛像[开局全体10伤])', cb: () => { Combat.takeDmg(20, true); State.relics.push('【佛像】开局震慑'); Game.showToast('获得法宝 佛像'); } },
                { text: '敬拜佛像 (悟性归零，获得卡牌“念奴娇”)', cb: () => { State.wuxing = 0; State.deck.push('c9'); Game.showToast('获得 念奴娇'); } }
            ]}
        };
