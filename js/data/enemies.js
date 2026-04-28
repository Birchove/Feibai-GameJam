// Enemy data dictionary
const EnemyDB = {
    fight1: {
        id: 'e1', name: '\u6e38\u9b42', hp: 80, sprite: "url('assets/enemy_1.png') center/cover, #222",
        intent: (enemy) => {
            if(enemy.turnCounter % 2 === 0) {
                const dmg = 4 + 5 * (enemy.turnCounter/2 - 1);
                return `\u610f\u56fe: \u653b\u51fb (${dmg})`;
            }
            return '\u610f\u56fe: \u7b49\u5f85';
        },
        act: (enemy) => {
            if(enemy.turnCounter % 2 === 0) {
                let dmg = 4 + 5 * (enemy.turnCounter/2 - 1);
                if(enemy.weak > 0) dmg = Math.floor(dmg * 0.7);
                Combat.takeDmg(dmg);
            }
        }
    },
    fight2: {
        id: 'e2', name: '\u6076\u9b3c', hp: 100, sprite: "url('assets/enemy_2.png') center/cover, #222",
        intent: (enemy) => enemy.turnCounter % 2 !== 0 ? '\u610f\u56fe: \u865a\u5f31\u5492' : '\u610f\u56fe: \u653b\u51fb (8)',
        act: (enemy) => {
            if(enemy.turnCounter % 2 !== 0) {
                State.combat.player.weak += 1;
                Game.showToast('\u53d7\u5230\u865a\u5f31\u5492\uff01\u9020\u6210\u7684\u4f24\u5bb3-30%');
            } else {
                let dmg = 8;
                if(enemy.weak > 0) dmg = Math.floor(dmg * 0.7);
                Combat.takeDmg(dmg);
            }
        }
    }
};
