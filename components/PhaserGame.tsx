"use client";
import { useEffect, useRef } from "react";
import type Phaser from "phaser";

const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 600;
const PLAYER_MAX_HP = 100;
const WOLF_MAX_HP = 40;
const ATTACK_DAMAGE = 20;
const WOLF_DAMAGE = 12;

function createPlayerSpritesheet(scene: Phaser.Scene) {
  const frameW = 32;
  const frameH = 48;
  const frames = 4;

  const g = scene.make.graphics({}, false);

  for (let f = 0; f < frames; f++) {
    const ox = f * frameW;
    const swing = Math.sin((f / frames) * Math.PI * 2) * 5;

    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(ox + 16, frameH - 2, 18, 5);

    g.fillStyle(0x2c5282);
    g.fillRect(ox + 10 - swing, 33, 5, 13);
    g.fillRect(ox + 17 + swing, 33, 5, 13);

    g.fillStyle(0x4a90d9);
    g.fillRoundedRect(ox + 7, 17, 18, 17, 4);

    g.fillStyle(0xffdbac);
    g.fillRect(ox + 4 - swing * 0.8, 19, 4, 11);
    g.fillRect(ox + 24 + swing * 0.8, 19, 4, 11);

    g.fillStyle(0xffdbac);
    g.fillCircle(ox + 16, 11, 9);

    g.fillStyle(0x2d3748);
    g.fillRect(ox + 7, 3, 18, 6);

    g.fillStyle(0x000000);
    g.fillCircle(ox + 12, 11, 1.5);
    g.fillCircle(ox + 20, 11, 1.5);
  }

  g.generateTexture("player", frameW * frames, frameH);
  g.destroy();

  const texture = scene.textures.get("player");
  for (let i = 0; i < frames; i++) {
    texture.add(i, 0, i * frameW, 0, frameW, frameH);
  }
}

function createWolfSpritesheet(scene: Phaser.Scene) {
  const frameW = 56;
  const frameH = 44;
  const frames = 4;

  const g = scene.make.graphics({}, false);

  for (let f = 0; f < frames; f++) {
    const ox = f * frameW + 6;
    const legSwing = Math.sin((f / frames) * Math.PI * 2) * 5;
    const tailSwing = Math.sin((f / frames) * Math.PI * 2) * 6;

    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(ox + 26, frameH - 1, 30, 6);

    g.lineStyle(4, 0x5c4a3a);
    g.beginPath();
    g.moveTo(ox + 2, 20);
    g.lineTo(ox - 4 + tailSwing, 12);
    g.lineTo(ox - 10 + tailSwing, 16);
    g.strokePath();

    g.fillStyle(0x3d2f25);
    g.fillRect(ox + 14, 30 + legSwing, 6, 11);
    g.fillRect(ox + 24, 30 - legSwing, 6, 11);
    g.fillRect(ox + 32, 30 - legSwing, 6, 11);
    g.fillRect(ox + 20, 30 + legSwing, 6, 11);

    g.fillStyle(0x5c4a3a);
    g.fillEllipse(ox + 24, 24, 38, 18);

    g.fillStyle(0xd4c4b0);
    g.fillEllipse(ox + 22, 27, 22, 10);

    g.fillStyle(0x4a3828);
    g.fillEllipse(ox + 38, 18, 16, 14);

    g.fillStyle(0x6b5344);
    g.fillTriangle(ox + 30, 4, ox + 34, 14, ox + 38, 4);
    g.fillTriangle(ox + 42, 4, ox + 46, 14, ox + 50, 4);

    g.fillStyle(0xc9a88e);
    g.fillTriangle(ox + 32, 6, ox + 34, 12, ox + 36, 6);
    g.fillTriangle(ox + 44, 6, ox + 46, 12, ox + 48, 6);

    g.fillStyle(0x8b7355);
    g.fillEllipse(ox + 46, 20, 10, 7);

    g.fillStyle(0x1a1a1a);
    g.fillCircle(ox + 49, 19, 2);

    g.fillStyle(0xff6b35);
    g.fillCircle(ox + 40, 15, 2.5);
    g.fillCircle(ox + 45, 15, 2.5);

    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(ox + 41, 14, 1);
    g.fillCircle(ox + 46, 14, 1);
  }

  g.generateTexture("wolf", frameW * frames, frameH);
  g.destroy();

  const texture = scene.textures.get("wolf");
  for (let i = 0; i < frames; i++) {
    texture.add(i, 0, i * frameW, 0, frameW, frameH);
  }
}

function createMountainTexture(
  scene: Phaser.Scene,
  key: string,
  color: number,
  snowColor: number,
  peaks: { x: number; h: number }[]
) {
  const w = 800;
  const h = 260;
  const g = scene.make.graphics({}, false);

  g.fillStyle(color);
  g.beginPath();
  g.moveTo(0, h);
  for (const peak of peaks) {
    g.lineTo(peak.x, h - peak.h);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();

  g.fillStyle(snowColor);
  for (const peak of peaks) {
    if (peak.h > 120) {
      g.fillTriangle(peak.x - 18, h - peak.h + 28, peak.x, h - peak.h, peak.x + 18, h - peak.h + 28);
    }
  }

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
        private ground!: Phaser.GameObjects.Rectangle;
        private sky!: Phaser.GameObjects.TileSprite;
        private wolves!: Phaser.Physics.Arcade.Group;
        private attackKey!: Phaser.Input.Keyboard.Key;
        private restartKey!: Phaser.Input.Keyboard.Key;
        private canAttack = true;
        private playerHealth = PLAYER_MAX_HP;
        private playerHpFill!: Phaser.GameObjects.Rectangle;
        private gameOver = false;

        constructor() {
          super("GameScene");
        }

        preload() {
          this.load.image("sky", "/sky.png");
          createPlayerSpritesheet(this);
          createWolfSpritesheet(this);

          createMountainTexture(this, "mountains-far", 0x5b6b7a, 0xdde4ea, [
            { x: 100, h: 140 },
            { x: 280, h: 190 },
            { x: 450, h: 130 },
            { x: 620, h: 210 },
            { x: 750, h: 150 },
          ]);

          createMountainTexture(this, "mountains-near", 0x3d4f5f, 0xc8d4dc, [
            { x: 60, h: 170 },
            { x: 220, h: 230 },
            { x: 400, h: 160 },
            { x: 560, h: 200 },
            { x: 720, h: 175 },
          ]);
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
              .setScrollFactor(0.25)
              .setDepth(-8);
            this.add
              .image(x + 300, 584, "mountains-near")
              .setOrigin(0.5, 1)
              .setScrollFactor(0.45)
              .setDepth(-5);
          }

          this.ground = this.add.rectangle(WORLD_WIDTH / 2, 584, WORLD_WIDTH, 32, 0x5d8a3e);
          this.ground.setDepth(-1);
          this.physics.add.existing(this.ground, true);

          this.anims.create({
            key: "walk",
            frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1,
          });

          this.anims.create({
            key: "wolf-run",
            frames: this.anims.generateFrameNumbers("wolf", { start: 0, end: 3 }),
            frameRate: 12,
            repeat: -1,
          });

          this.player = this.physics.add
            .sprite(200, 450, "player", 0)
            .setCollideWorldBounds(true)
            .setBounce(0.1)
            .setScale(2)
            .setDepth(1);

          this.player.setSize(14, 40);
          this.player.setOffset(9, 6);
          this.physics.add.collider(this.player, this.ground);

          this.wolves = this.physics.add.group();
          const wolfPositions = [700, 1300, 2000, 2700, 3300];
          for (const x of wolfPositions) {
            const wolf = this.wolves.create(x, 500, "wolf", 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            wolf.setScale(2).setCollideWorldBounds(true).setDepth(1);
            wolf.setSize(40, 26);
            wolf.setOffset(8, 12);
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
          if (this.gameOver) return;

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

        private performAttack() {
          if (!this.canAttack || this.gameOver) return;
          this.canAttack = false;

          const dir = this.player.flipX ? -1 : 1;
          const attackX = this.player.x + dir * 50;
          const attackY = this.player.y;

          const punch = this.add.circle(attackX, attackY - 10, 18, 0xffffff, 0.5);
          punch.setDepth(2);
          this.tweens.add({
            targets: punch,
            alpha: 0,
            scale: 1.4,
            duration: 150,
            onComplete: () => punch.destroy(),
          });

          this.wolves.getChildren().forEach((child) => {
            const wolf = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            if (!wolf.active) return;

            const dist = Phaser.Math.Distance.Between(attackX, attackY, wolf.x, wolf.y);
            if (dist < 85) {
              this.damageWolf(wolf, ATTACK_DAMAGE);
            }
          });

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

            if (!this.gameOver && distToPlayer < 240) {
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

        update() {
          this.sky.tilePositionX = this.cameras.main.scrollX * 0.15;

          if (this.gameOver) {
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

          if (left) {
            this.player.setVelocityX(-160);
            this.player.setFlipX(true);
            if (onGround) this.player.anims.play("walk", true);
          } else if (right) {
            this.player.setVelocityX(160);
            this.player.setFlipX(false);
            if (onGround) this.player.anims.play("walk", true);
          } else {
            this.player.setVelocityX(0);
            if (this.player.anims.isPlaying) this.player.anims.stop();
            this.player.setFrame(0);
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
