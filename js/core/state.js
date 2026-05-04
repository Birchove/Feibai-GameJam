const State = {
            class: '', gold: 100, hp: 50, maxHp: 50, energy: 3, maxEnergy: 3, momentum: 0, 
            str: 5, def: 5, wuxing: 2.5, agi: 1,  
            weapon: '', poetry: [], 
            deck: [], relics: [], mapNodeIndex: 0, isViewingMap: false, 
            // 开发者模式（仅本局生效，不持久化）
            _dev: false, _devGod: false, _devOneShot: false, _devSkipEnemy: false, 
            combat: {
                inCombat: false, turn: 1, isPlayerTurn: true, hand: [], drawPile: [], discardPile: [], exhaustPile: [],
                enemy: { id: '', name: '', hp: 80, maxHp: 80, turnCounter: 1, dmgMod: 1, weak: 0, vuln: 0, stun: false },
                player: { block: 0, dmgMod: 0, cantPlay: false, cantDmg: false, weak: 0, vuln: 0, turnStr: 0, turnDef: 0, turnDmgMod: 0, combatStr: 0, combatDef: 0, wStr: 0, wDef: 0, keepBlock: 0, nianNuJiao: false, dmgDouble: false, takeDmgDouble: false, daoGuang: false, ignorePZ: false, cantDmgNextTurn: false }, pzHistory: []
            }
        };
