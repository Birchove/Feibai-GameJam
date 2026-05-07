# 《飞白》角色界面与怪物生图提示词（统一风格版）

本文件用于直接投喂文生图模型，目标风格与当前项目一致：  
**中式武侠 / 阴间志怪 / 暗金墨青色调 / 2D数字绘画 / 清晰轮廓 / 适配UI叠层**。

---

## 1) 全局风格锚点（建议固定附加）

可作为每条提示词的通用前缀：

```text
Chinese dark wuxia fantasy, painterly 2D game art, high clarity, clean silhouette, cinematic lighting, ink wash texture, teal and dark gold palette, subtle fog, dramatic rim light, no photorealism, no 3D render look
```

通用负面词（建议每条都带）：

```text
blurry, lowres, noisy, jpeg artifacts, photorealistic face, modern clothes, sci-fi armor, western knight style, extra limbs, extra fingers, deformed anatomy, text, watermark, logo, UI frame, cluttered background
```

---

## 2) 角色界面图（直接可用）

> 你要求“直接生成两个角色界面的图片”，这里给两条可直接生图的主提示词。  
> 推荐尺寸：`540x1080`（对应 info 立绘）与 `540x720`（对应 combat 立绘）或按你模型习惯等比替换。

### A. 角色界面图 01（信息页主立绘 / portrait_info）

```text
Chinese dark wuxia swordsman heroine, full body portrait, standing in a composed upright pose, elegant black and deep-red hanfu with light armor details, ancient sword at waist, long dark hair with simple jade ornament, calm and resolute expression, ghostly underworld ambience, stone bridge and faint lantern in distant background, composition centered and slightly upper-weighted for UI overlay, keep lower body readable but not overly detailed, painterly 2D game illustration, high detail face and costume folds, clear silhouette, dark teal shadows with warm gold highlights
```

建议参数（可按模型改写）：

```text
Aspect ratio: 1:2
Stylize: medium
Quality: high
```

### B. 角色界面图 02（战斗立绘 / portrait_combat）

```text
Chinese dark wuxia heroine battle portrait, half-to-three-quarter body, dynamic ready stance, hand gripping sword hilt, eyes focused forward, cloth and hair slightly wind-swept, same character design as info portrait, simplified background with smoky gradient and faint ink texture for combat readability, strong edge lighting, high contrast silhouette, painterly 2D game art, clean center composition, no busy details near top and bottom UI zones
```

建议参数：

```text
Aspect ratio: 3:4
Stylize: medium
Quality: high
```

---

## 3) 怪物提示词（按你现有敌人体系可批量生产）

使用方式：将下方“基础模板”+“对应怪物关键词块”拼接生成。  
目标：同风格、同世界观、识别度高、适配 3:4 敌人槽位。

### 3.1 怪物基础模板

```text
生成图片：
Chinese underworld monster concept, dark wuxia ghost folklore style, full body, isolated readable silhouette, menacing posture, torn ancient robe and ritual accessories, cold cyan mist and dim gold rim light, painterly 2D game illustration, clean shape language for card-battle UI, medium background detail, no modern elements，比例3：4（横3纵4）
```

### 3.2 单体怪物关键词块（可直接追加到基础模板）

- `legacy_fight1 / 游魂`
```text
emaciated wandering soul, hollow eyes, translucent lower body, drifting ash particles, weak but eerie presence
```

- `legacy_fight2 / 恶鬼`
```text
feral starving ghost, sharp claws, twisted grin, curse markings on neck and arms, aggressive forward lean
```

- `di_fu_ye_gui / 地府野鬼`
```text
underworld ghoul soldier, broken iron shackles, ragged armor scraps, muddy bone texture, heavy oppressive aura
```

- `bai_hun_ye_gui / 白魂野鬼`
```text
pale spectral ghost, white funeral cloth, floating paper talismans, sorrowful but hostile expression
```

- `lan_shi_guai / 烂尸怪`
```text
rotting corpse monster, exposed ribs and decayed flesh, wet mud and corpse fluid stains, dragging gait
```

- `chi_mei_single / 魑魅魍魉（单体模板）`
```text
small agile swamp ghost, hunched body, long arms, mask-like face, sly and chaotic expression, designed to appear in group of four
```

- `ye_ku_gui / 夜哭鬼`
```text
weeping night ghost, elongated neck, tear-like black streaks, mournful scream pose, haunting emotional impact
```

- `yin_sha / 阴煞`
```text
shadow fiend made of smoke and armor fragments, unclear lower limbs, sharp horn-like silhouette, suffocating dark aura
```

- `ku_hai_guan_li / 枯骸官吏`
```text
skeletal underworld official, ancient bureaucrat robe, bamboo ledger and rusted token, cold arrogant posture
```


- `diao_si_gui / 吊死鬼`
```text
hanged ghost with broken rope, tilted neck, swollen pale face, hanging posture adapted into standing silhouette
```

- `ye_xun_a / 夜巡阴差·甲`
```text
underworld patrol guard A, heavier armor, halberd weapon, disciplined stance, stoic expression
```

生成图片：
Chinese underworld monster concept, dark wuxia ghost folklore style, full body, isolated readable silhouette, menacing posture, torn ancient robe and ritual accessories, cold cyan mist and dim gold rim light, painterly 2D game illustration, clean shape language for card-battle UI, medium background detail, no modern elements，比例3：4（横3纵4）

- `ye_xun_b / 夜巡阴差·乙`
```text
underworld patrol guard B, lighter armor, hooked blade, faster stance, predatory eyes
```

- `hei_wu_chang / 黑无常`
```text
tall black-robed underworld enforcer, long hat, chain weapon, stern and terrifying presence, authoritative
```

- `bai_wu_chang / 白无常`
```text
tall white-robed underworld enforcer, long hat, mourning smile, elegant but sinister, spectral grace
```

- `yan_luo_wang / 阎罗王`
```text
hell king boss, massive robe layers, crown and judge tablet, throne-like stance, overwhelming dominator aura, strongest contrast and detail
```

- `village_strong_rand / 路劫阴魁`
```text
bandit-like underworld brute, mixed human-ghost traits, heavy cleaver, rough cloth and bone accessories, roadside ambush mood
```

---

## 4) 快速组合示例（怪物）

示例：`黑无常`

```text
Chinese underworld monster concept, dark wuxia ghost folklore style, full body, isolated readable silhouette, menacing posture, torn ancient robe and ritual accessories, cold cyan mist and dim gold rim light, painterly 2D game illustration, clean shape language for card-battle UI, medium background detail, no modern elements, tall black-robed underworld enforcer, long hat, chain weapon, stern and terrifying presence, authoritative
```

负面词：

```text
blurry, lowres, photorealistic, sci-fi, cartoon chibi, extra limbs, text, watermark
```

---

## 5) 清晰度与风格一致性建议

- 同一角色/怪物批量出图时，固定“风格锚点”和“负面词”，只替换关键词块。
- 角色图务必强调 `clean silhouette` 与 `UI overlay friendly composition`，避免背景太花导致UI冲突。
- 怪物图优先做“中近景全身”，便于 `enemy_*` 资源在 3:4 框内稳定裁切。
- 若模型支持“seed”，同类资产建议固定或小范围 seed，保持角色一致性。

