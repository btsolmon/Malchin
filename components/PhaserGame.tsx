"use client";
import { useEffect, useRef } from "react";
import type Phaser from "phaser";

const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 600;
const PLAYER_MAX_HP = 100;
const WOLF_MAX_HP = 40;
const ATTACK_DAMAGE = 20;
const WOLF_DAMAGE = 12;

const PLAYER_FRAME = 2; // side-view facing right (4-col sheet: front, diag, side, diag)
const WOLF_RUN_FRAMES = [0, 1, 4]; // side-view run cycle only

function createMountainTexture(
  scene: Phaser.Scene,
  key: string,
  peaks: { x: number; h: number }[],
  opts: { haze?: number; bodyColor?: number; highlightColor?: number; snow?: boolean } = {}
) {
  const w = 800;
  const h = 260;
  const g = scene.make.graphics({}, false);
  const haze = opts.haze ?? 1;
  const bodyColor = opts.bodyColor ?? 0x4f5f74;
  const highlightColor = opts.highlightColor ?? 0x6b7a91;
  const showSnow = opts.snow ?? true;

  const bands = [
    { y: 0, color: 0xf8d4b0, alpha: 0.45 * haze },
    { y: 35, color: 0xe8b8c8, alpha: 0.38 * haze },
    { y: 70, color: 0xc4aac8, alpha: 0.32 * haze },
    { y: 105, color: 0x96aac8, alpha: 0.28 * haze },
    { y: 140, color: 0x7a94b8, alpha: 0.22 * haze },
  ];
  for (const b of bands) {
    g.fillStyle(b.color, b.alpha);
    g.fillRect(0, b.y, w, 40);
  }

  g.fillStyle(0xffffff, 0.2);
  g.fillEllipse(120, 48, 100, 16);
  g.fillEllipse(480, 28, 130, 18);
  g.fillEllipse(690, 62, 80, 12);

  g.fillStyle(0x9aa4b8, 0.5 * haze);
  g.beginPath();
  g.moveTo(0, h);
  for (const peak of peaks) {
    g.lineTo(peak.x, h - peak.h * 0.68 - 14);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();

  g.fillStyle(bodyColor);
  g.beginPath();
  g.moveTo(0, h);
  for (const peak of peaks) {
    g.lineTo(peak.x, h - peak.h);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();

  g.fillStyle(highlightColor, 0.5);
  for (const peak of peaks) {
    g.fillTriangle(peak.x - 50, h, peak.x, h - peak.h, peak.x - 8, h - peak.h * 0.38);
  }

  g.lineStyle(1, 0x3a4555, 0.35);
  for (const peak of peaks) {
    g.beginPath();
    g.moveTo(peak.x - 30, h - peak.h * 0.55);
    g.lineTo(peak.x - 8, h - peak.h * 0.82);
    g.strokePath();
  }

  if (showSnow) {
    for (const peak of peaks) {
      if (peak.h > 95) {
        const snowBase = h - peak.h + 28;
        g.fillStyle(0xf5f2ef);
        g.fillTriangle(peak.x - 22, snowBase, peak.x, h - peak.h, peak.x + 22, snowBase);
        g.fillStyle(0xf6c4c4, 0.5);
        g.fillTriangle(peak.x - 8, h - peak.h + 8, peak.x, h - peak.h, peak.x + 5, h - peak.h + 16);
      }
    }
  }

  g.generateTexture(key, w, h);
  g.destroy();
}

function createMidHillsTexture(scene: Phaser.Scene, key: string) {
  const w = 800;
  const h = 120;
  const g = scene.make.graphics({}, false);

  g.fillStyle(0x6b8f4e, 0.85);
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(80, h - 35);
  g.lineTo(200, h - 55);
  g.lineTo(340, h - 30);
  g.lineTo(480, h - 62);
  g.lineTo(620, h - 38);
  g.lineTo(760, h - 50);
  g.lineTo(w, h - 28);
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();

  g.fillStyle(0x7da55a, 0.55);
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(120, h - 22);
  g.lineTo(280, h - 40);
  g.lineTo(420, h - 18);
  g.lineTo(560, h - 35);
  g.lineTo(w, h - 12);
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();

  for (let x = 40; x < w; x += 55) {
    g.fillStyle(0x5a7a3e, 0.4);
    g.fillEllipse(x + (x % 17), h - 8, 28, 6);
  }

  g.generateTexture(key, w, h);
  g.destroy();
}

function createGroundTexture(scene: Phaser.Scene, key: string) {
  const w = 64;
  const h = 32;
  const g = scene.make.graphics({}, false);

  g.fillStyle(0x4a7030);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x5d8a3e);
  g.fillRect(0, 0, w, 10);

  for (let i = 0; i < 18; i++) {
    const x = (i * 17 + 3) % w;
    const bladeH = 4 + (i % 5);
    g.fillStyle(i % 3 === 0 ? 0x6fa048 : 0x7cb852);
    g.fillRect(x, 2, 2, bladeH);
    g.fillRect(x + 1, 1, 1, bladeH - 1);
  }

  g.fillStyle(0x3d5c28);
  for (let i = 0; i < 8; i++) {
    g.fillRect((i * 9 + 2) % w, 12 + (i % 3), 3, 2);
  }

  g.generateTexture(key, w, h);
  g.destroy();
}

function createGerTexture(scene: Phaser.Scene, key: string) {
  const w = 800;
  const h = 260;
  const g = scene.make.graphics({}, false);

  const drawSmoke = (cx: number, topY: number, scale: number) => {
    g.fillStyle(0xffffff, 0.18);
    g.fillEllipse(cx - 4 * scale, topY - 8 * scale, 14 * scale, 8 * scale);
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(cx + 6 * scale, topY - 18 * scale, 18 * scale, 10 * scale);
    g.fillStyle(0xffffff, 0.08);
    g.fillEllipse(cx - 2 * scale, topY - 28 * scale, 22 * scale, 12 * scale);
  };

  const drawGer = (cx: number, baseY: number, scale: number, withSmoke = false) => {
    const wallW = 100 * scale;
    const wallH = 42 * scale;
    const roofH = 46 * scale;

    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(cx, baseY + 5 * scale, wallW * 1.05, 10 * scale);

    g.fillStyle(0xe9ddc7);
    g.fillRoundedRect(cx - wallW / 2, baseY - wallH, wallW, wallH, 5 * scale);

    g.fillStyle(0xf5efe2, 0.35);
    g.fillRoundedRect(cx - wallW / 2 + 4, baseY - wallH + 4, wallW * 0.35, wallH - 8, 3 * scale);

    g.fillStyle(0xb64a2e);
    g.fillRect(cx - wallW / 2, baseY - wallH, wallW, 7 * scale);
    g.fillStyle(0xd4af37);
    for (let i = 0; i < 7; i++) {
      g.fillRect(cx - wallW / 2 + i * (wallW / 7) + 2, baseY - wallH + 1.5 * scale, 4 * scale, 4 * scale);
    }

    g.fillStyle(0x6b3a20);
    g.fillRect(cx - 11 * scale, baseY - 20 * scale, 22 * scale, 20 * scale);
    g.fillStyle(0xffb347, 0.35);
    g.fillRect(cx - 8 * scale, baseY - 17 * scale, 16 * scale, 14 * scale);
    g.fillStyle(0xd4af37);
    g.fillRect(cx - 11 * scale, baseY - 20 * scale, 22 * scale, 3 * scale);

    g.fillStyle(0xf3ede0);
    g.fillTriangle(
      cx - wallW / 2 - 5 * scale,
      baseY - wallH,
      cx,
      baseY - wallH - roofH,
      cx + wallW / 2 + 5 * scale,
      baseY - wallH
    );

    g.fillStyle(0xffffff, 0.15);
    g.fillTriangle(
      cx - wallW / 4,
      baseY - wallH - roofH * 0.3,
      cx,
      baseY - wallH - roofH,
      cx + wallW / 6,
      baseY - wallH - roofH * 0.5
    );

    g.lineStyle(Math.max(1, 1 * scale), 0xcabb9c, 0.85);
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(cx, baseY - wallH - roofH);
      g.lineTo(cx + i * (wallW / 5), baseY - wallH);
      g.strokePath();
    }

    g.fillStyle(0x4a3828);
    g.fillCircle(cx, baseY - wallH - roofH, 4 * scale);
    g.fillStyle(0xc0392b, 0.9);
    g.fillRect(cx - 1.5 * scale, baseY - wallH - roofH - 14 * scale, 3 * scale, 12 * scale);

    if (withSmoke) drawSmoke(cx, baseY - wallH - roofH - 14 * scale, scale);
  };

  drawGer(170, h - 6, 1, true);
  drawGer(430, h - 2, 0.72, false);
  drawGer(630, h - 10, 0.5, true);

  g.lineStyle(3, 0x6b4a2f, 0.85);
  g.beginPath();
  g.moveTo(40, h - 4);
  g.lineTo(760, h - 4);
  g.strokePath();
  for (let x = 40; x <= 760; x += 26) {
    g.fillStyle(0x6b4a2f, 0.85);
    g.fillRect(x, h - 14, 3, 12);
    if (x % 52 === 14) {
      g.lineStyle(+2, 0x5a3d28, 0.6);
      g.beginPath();
      g.moveTo(x + 1, h - 14);
      g.lineTo(x + 8, h - 22);
      g.lineTo(x + 15, h - 14);
      g.strokePath();
    }
  }

  g.fillStyle(0x8b6914, 0.7);
  g.fillCircle(310, h - 18, 5);
  g.fillCircle(315, h - 16, 4);

  g.generateTexture(key, w, h);
  g.destroy();
}

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("phaser").then(({ default: Phaser }) => {
      if (cancelled || !gameRef.current || gameInstanceRef.current) return;

      class GameScene extends Phaser.Scene {
        private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private wasd!: {
          up: Phaser.Input.Keyboard.Key;
          down: Phaser.Input.Keyboard.Key;
          left: Phaser.Input.Keyboard.Key;
          right: Phaser.Input.Keyboard.Key;
        };
        private ground!: Phaser.GameObjects.TileSprite;
        private sky!: Phaser.GameObjects.TileSprite;
        private wolves!: Phaser.Physics.Arcade.Group;
        private attackKey!: Phaser.Input.Keyboard.Key;
        private restartKey!: Phaser.Input.Keyboard.Key;
        private canAttack = true;
        private playerHealth = PLAYER_MAX_HP;
        private playerHpFill!: Phaser.GameObjects.Rectangle;
        private gameOver = false;
        private victory = false;
        private totalWolves = 0;
        private wolvesDefeated = 0;
        private wolfCountText!: Phaser.GameObjects.Text;

        constructor() {
          super("GameScene");
        }

   preload() {
  this.load.image("sky", "/sky.png");

  // 368×184, 4×2 grid → 92×92 per frame (8-direction sheet; use side-view only)
  this.load.spritesheet("player", "/assets/man-spritesheet.png", {
    frameWidth: 92,
    frameHeight: 92,
  });

  // 272×136, 4×2 grid → 68×68 per frame
  this.load.spritesheet("wolf", "/assets/wolf-spritesheet.png", {
    frameWidth: 68,
    frameHeight: 68,
  });

  createMountainTexture(this, "mountains-far", [
    { x: 100, h: 155 },
    { x: 280, h: 205 },
    { x: 450, h: 145 },
    { x: 620, h: 220 },
    { x: 750, h: 165 },
  ], { haze: 1, bodyColor: 0x4a5a6e, snow: true });

  createMountainTexture(this, "mountains-mid", [
    { x: 60, h: 90 },
    { x: 220, h: 120 },
    { x: 400, h: 75 },
    { x: 580, h: 110 },
    { x: 720, h: 85 },
  ], { haze: 0.6, bodyColor: 0x5a6b52, highlightColor: 0x6d8058, snow: false });

  createMidHillsTexture(this, "hills-near");
  createGroundTexture(this, "ground-tile");
  createGerTexture(this, "gers");
}

        create() {
          this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
          this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

          this.sky = this.add.tileSprite(
            WORLD_WIDTH / 2,
            WORLD_HEIGHT / 2,
            WORLD_WIDTH + 1600,
            WORLD_HEIGHT,
            "sky"
          );
          this.sky.setScrollFactor(0);
          this.sky.setDepth(-10);

          for (let x = 400; x <= WORLD_WIDTH; x += 800) {
            this.add
              .image(x, 584, "mountains-far")
              .setOrigin(0.5, 1)
              .setScrollFactor(0.15)
              .setDepth(-9);
            this.add
              .image(x + 200, 584, "mountains-mid")
              .setOrigin(0.5, 1)
              .setScrollFactor(0.3)
              .setDepth(-7);
            this.add
              .image(x - 100, 584, "hills-near")
              .setOrigin(0.5, 1)
              .setScrollFactor(0.55)
              .setDepth(-4);
            this.add
              .image(x + 300, 584, "gers")
              .setOrigin(0.5, 1)
              .setScrollFactor(0.45)
              .setDepth(-3);
          }

          this.ground = this.add.tileSprite(WORLD_WIDTH / 2, 584, WORLD_WIDTH, 32, "ground-tile");
          this.ground.setTileScale(1, 1);
          this.ground.setDepth(-1);
          this.physics.add.existing(this.ground, true);

          this.anims.create({
            key: "walk",
            frames: [{ key: "player", frame: PLAYER_FRAME }],
            frameRate: 8,
            repeat: -1,
          });

          this.anims.create({
            key: "wolf-run",
            frames: WOLF_RUN_FRAMES.map((frame) => ({ key: "wolf", frame })),
            frameRate: 10,
            repeat: -1,
          });

          this.player = this.physics.add
            .sprite(200, 450, "player", PLAYER_FRAME)
            .setCollideWorldBounds(true)
            .setBounce(0.1)
            .setScale(2)
            .setDepth(1)
            .setOrigin(0.5, 1);

          this.player.setSize(38, 72);
          this.player.setOffset(27, 18);
          this.physics.add.collider(this.player, this.ground);

          this.wolves = this.physics.add.group();
          const wolfPositions = [700, 1300, 2000, 2700, 3300];
          this.totalWolves = wolfPositions.length;
          this.wolvesDefeated = 0;

          for (const x of wolfPositions) {
            const wolf = this.wolves.create(x, 500, "wolf", 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            wolf.setScale(2).setCollideWorldBounds(true).setDepth(1).setOrigin(0.5, 1);
            wolf.setSize(52, 34);
            wolf.setOffset(8, 30);
            wolf.setData("health", WOLF_MAX_HP);
            wolf.setData("maxHealth", WOLF_MAX_HP);
            wolf.setData("patrolDir", Math.random() > 0.5 ? 1 : -1);
            wolf.setData("patrolMin", x - 120);
            wolf.setData("patrolMax", x + 120);
            wolf.setData("lastAttack", 0);
            this.attachHealthBar(wolf, WOLF_MAX_HP, 48);
            this.physics.add.collider(wolf, this.ground);
          }

          this.createPlayerHud();

          this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
          this.cameras.main.setDeadzone(120, 80);

          this.cursors = this.input.keyboard!.createCursorKeys();
          this.wasd = {
            up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
          };
          this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
          this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        }

        private createPlayerHud() {
          this.add
            .text(16, 12, "HP", { fontSize: "13px", color: "#ffffff", fontStyle: "bold" })
            .setScrollFactor(0)
            .setDepth(100);

          this.add
            .rectangle(48, 18, 104, 12, 0x1a1a1a, 0.85)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(100);

          this.playerHpFill = this.add
            .rectangle(50, 18, 100, 8, 0x22c55e)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(101);

          this.wolfCountText = this.add
            .text(16, 34, `Чоно: 0/${this.totalWolves}`, {
              fontSize: "13px",
              color: "#ffffff",
              fontStyle: "bold",
            })
            .setScrollFactor(0)
            .setDepth(100);
        }

        private attachHealthBar(
          entity: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
          maxHp: number,
          barWidth: number
        ) {
          const container = this.add.container(entity.x, entity.y - 52);
          const innerWidth = barWidth - 4;

          const bg = this.add.rectangle(0, 0, barWidth, 7, 0x1a1a1a, 0.85);
          const fill = this.add
            .rectangle(-barWidth / 2 + 2, 0, innerWidth, 5, 0xef4444)
            .setOrigin(0, 0.5);

          container.add([bg, fill]);
          container.setDepth(10);

          entity.setData("hpContainer", container);
          entity.setData("hpFill", fill);
          entity.setData("hpInnerWidth", innerWidth);
          entity.setData("maxHealth", maxHp);
        }

        private updateEntityHealthBar(entity: Phaser.GameObjects.Sprite) {
          const container = entity.getData("hpContainer") as Phaser.GameObjects.Container | undefined;
          const fill = entity.getData("hpFill") as Phaser.GameObjects.Rectangle | undefined;
          const innerWidth = entity.getData("hpInnerWidth") as number;
          const health = entity.getData("health") as number;
          const maxHealth = entity.getData("maxHealth") as number;

          if (!container || !fill) return;

          container.setPosition(entity.x, entity.y - 52);
          const ratio = Math.max(0, health / maxHealth);
          fill.width = innerWidth * ratio;
          fill.fillColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
        }

        private updatePlayerHealthBar() {
          const ratio = this.playerHealth / PLAYER_MAX_HP;
          this.playerHpFill.width = 100 * ratio;
          this.playerHpFill.fillColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
        }

        private damagePlayer(amount: number) {
          if (this.gameOver || this.victory) return;

          this.playerHealth = Math.max(0, this.playerHealth - amount);
          this.player.setTint(0xff4444);
          this.time.delayedCall(120, () => {
            if (this.player.active) this.player.clearTint();
          });
          this.updatePlayerHealthBar();

          if (this.playerHealth <= 0) {
            this.triggerGameOver();
          }
        }

        private damageWolf(
          wolf: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
          amount: number
        ) {
          const health = (wolf.getData("health") as number) - amount;
          wolf.setData("health", Math.max(0, health));
          wolf.setTint(0xff8888);
          this.time.delayedCall(100, () => {
            if (wolf.active) wolf.clearTint();
          });
          this.updateEntityHealthBar(wolf);

          if (health <= 0) {
            this.killWolf(wolf);
          }
        }

        private killWolf(wolf: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
          const container = wolf.getData("hpContainer") as Phaser.GameObjects.Container;
          if (container) container.destroy();

          wolf.disableBody(true, false);
          this.tweens.add({
            targets: wolf,
            alpha: 0,
            angle: 90,
            y: wolf.y + 10,
            duration: 400,
            onComplete: () => wolf.destroy(),
          });

          this.wolvesDefeated += 1;
          this.wolfCountText.setText(`Чоно: ${this.wolvesDefeated}/${this.totalWolves}`);

          if (this.wolvesDefeated >= this.totalWolves) {
            this.triggerVictory();
          }
        }

        private triggerGameOver() {
          this.gameOver = true;
          this.player.setVelocity(0, 0);
          this.player.setTint(0x666666);
          this.physics.pause();

          const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.55);
          overlay.setScrollFactor(0).setDepth(200);

          this.add
            .text(400, 260, "GAME OVER", {
              fontSize: "52px",
              color: "#ef4444",
              fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);

          this.add
            .text(400, 330, "Чононд идэгдлээ...", {
              fontSize: "20px",
              color: "#ffffff",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);

          this.add
            .text(400, 380, "R — дахин эхлэх", {
              fontSize: "18px",
              color: "#d1d5db",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);
        }

        private triggerVictory() {
          this.victory = true;
          this.player.setVelocity(0, 0);

          const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5);
          overlay.setScrollFactor(0).setDepth(200);

          this.add
            .text(400, 250, "ЯЛАЛТ!", {
              fontSize: "56px",
              color: "#facc15",
              fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);

          this.add
            .text(400, 320, "Бүх чоныг ялан дийллээ!", {
              fontSize: "20px",
              color: "#ffffff",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);

          this.add
            .text(400, 360, "R — дахин эхлэх", {
              fontSize: "18px",
              color: "#d1d5db",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);
        }

        private spawnHitSpark(x: number, y: number) {
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const spark = this.add.circle(x, y, 2.5, 0xfff3b0, 0.9);
            spark.setDepth(4);
            this.tweens.add({
              targets: spark,
              x: x + Math.cos(angle) * 22,
              y: y + Math.sin(angle) * 22,
              alpha: 0,
              duration: 220,
              ease: "Quad.easeOut",
              onComplete: () => spark.destroy(),
            });
          }
        }

        private performAttack() {
          if (!this.canAttack || this.gameOver || this.victory) return;
          this.canAttack = false;

          const dir = this.player.flipX ? -1 : 1;
          const attackX = this.player.x + dir * 48;
          const attackY = this.player.y - 8;

          // quick squash-and-stretch punch feedback on the player
          this.tweens.add({
            targets: this.player,
            scaleX: 2.25,
            scaleY: 1.85,
            duration: 60,
            yoyo: true,
            ease: "Quad.easeOut",
          });

          // curved slash swipe in the facing direction
          const slash = this.add.graphics();
          slash.setDepth(3);
          slash.setPosition(attackX, attackY);
          const a0 = dir > 0 ? -55 : 235;
          const a1 = dir > 0 ? 55 : 125;
          slash.lineStyle(5, 0xfff6d5, 0.95);
          slash.beginPath();
          slash.arc(0, 0, 26, Phaser.Math.DegToRad(a0), Phaser.Math.DegToRad(a1), false);
          slash.strokePath();
          slash.lineStyle(2, 0xffffff, 0.6);
          slash.beginPath();
          slash.arc(0, 0, 18, Phaser.Math.DegToRad(a0), Phaser.Math.DegToRad(a1), false);
          slash.strokePath();

          this.tweens.add({
            targets: slash,
            alpha: 0,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 180,
            onComplete: () => slash.destroy(),
          });

          let hitSomething = false;
          this.wolves.getChildren().forEach((child) => {
            const wolf = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            if (!wolf.active) return;

            const dist = Phaser.Math.Distance.Between(attackX, attackY, wolf.x, wolf.y);
            if (dist < 85) {
              this.damageWolf(wolf, ATTACK_DAMAGE);
              this.spawnHitSpark(wolf.x, wolf.y - 20);
              hitSomething = true;
            }
          });

          if (hitSomething) {
            this.cameras.main.shake(90, 0.004);
          }

          this.time.delayedCall(350, () => {
            this.canAttack = true;
          });
        }

        private updateWolves() {
          this.wolves.getChildren().forEach((child) => {
            const wolf = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            if (!wolf.active) return;

            this.updateEntityHealthBar(wolf);

            const distToPlayer = Phaser.Math.Distance.Between(
              wolf.x,
              wolf.y,
              this.player.x,
              this.player.y
            );

            if (!this.gameOver && !this.victory && distToPlayer < 240) {
              const chaseDir = this.player.x >= wolf.x ? 1 : -1;
              wolf.setVelocityX(chaseDir * 110);
              wolf.setFlipX(chaseDir < 0);
              wolf.anims.play("wolf-run", true);

              if (distToPlayer < 55) {
                const lastAttack = wolf.getData("lastAttack") as number;
                if (this.time.now - lastAttack > 900) {
                  wolf.setData("lastAttack", this.time.now);
                  this.damagePlayer(WOLF_DAMAGE);
                }
              }
              return;
            }

            let patrolDir = wolf.getData("patrolDir") as number;
            const patrolMin = wolf.getData("patrolMin") as number;
            const patrolMax = wolf.getData("patrolMax") as number;

            if (wolf.x <= patrolMin) patrolDir = 1;
            if (wolf.x >= patrolMax) patrolDir = -1;
            wolf.setData("patrolDir", patrolDir);

            wolf.setVelocityX(patrolDir * 45);
            wolf.setFlipX(patrolDir < 0);
            wolf.anims.play("wolf-run", true);
          });
        }

        private playerWalkBob = 0;

        update() {
          this.sky.tilePositionX = this.cameras.main.scrollX * 0.12;

          if (this.gameOver || this.victory) {
            if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
              this.scene.restart();
            }
            return;
          }

          const onGround = this.player.body.blocked.down || this.player.body.touching.down;
          const left = this.cursors.left.isDown || this.wasd.left.isDown;
          const right = this.cursors.right.isDown || this.wasd.right.isDown;
          const jump =
            Phaser.Input.Keyboard.JustDown(this.cursors.up!) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.space!) ||
            Phaser.Input.Keyboard.JustDown(this.wasd.up);

          const moving = left || right;

          if (left) {
            this.player.setVelocityX(-160);
            this.player.setFlipX(true);
          } else if (right) {
            this.player.setVelocityX(160);
            this.player.setFlipX(false);
          } else {
            this.player.setVelocityX(0);
          }

          if (moving && onGround) {
            this.playerWalkBob += 0.25;
            this.player.setFrame(PLAYER_FRAME);
            this.player.setScale(2, 2 + Math.sin(this.playerWalkBob) * 0.04);
          } else {
            this.player.setFrame(PLAYER_FRAME);
            this.player.setScale(2, 2);
            if (this.player.anims.isPlaying) this.player.anims.stop();
          }

          if (jump && onGround) {
            this.player.setVelocityY(-330);
          }

          if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
            this.performAttack();
          }

          this.updateWolves();
        }
      }

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 600 } },
  },
  scene: GameScene,
  parent: gameRef.current,
};

      gameInstanceRef.current = new Phaser.Game(config);
    });

    return () => {
      cancelled = true;
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={gameRef} />
      <p className="text-sm text-gray-600">
        ← → / A D — алхах · ↑ / W / Space — үсрэх · X — цохих · R — дахин эхлэх
      </p>
    </div>
  );
}