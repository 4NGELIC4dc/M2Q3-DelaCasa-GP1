export class GameScene1 extends Phaser.Scene {
    constructor() {
        super("GameScene1");
        this.canBeHurt = true;  // Initialize the hurt flag
    }

    preload() {
        // Load Assets
        this.load.tilemapTiledJSON("map1", "/assets/tiles/CaveDungeon-01.json");
        this.load.image("tiles", "assets/png/spritesheet(01).png");
        this.load.image("key", "assets/png/16x16keySprite.png");
        this.load.image("chest", "assets/png/16x16chestSprite.png");
        this.load.image("txt_game_complete", "assets/png/txt_game_complete.png");
        this.load.image("txt_game_over", "assets/png/txt_game_over.png");
        this.load.image("heart", "assets/png/34x34heartSprite.png");
        this.load.image("spike", "assets/png/16x16spikeSprite.png");
        this.load.spritesheet("coin", "assets/png/16x16coinSprite.png", { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet("knight", "assets/png/16x16 knight.png", { frameWidth: 16, frameHeight: 16 });
        this.load.audio("coinSfx", "assets/mp3/coin_sfx.mp3");
        this.load.audio("hurtSfx", "assets/mp3/hurt_sfx.mp3");
        this.load.audio("jumpSfx", "assets/mp3/jump_sfx.mp3");
        this.load.audio("victorySfx", "assets/mp3/victory_sfx.mp3");
        this.load.audio("loseSfx", "assets/mp3/lose_sfx.mp3");
        this.load.audio("bgMusic", "assets/mp3/bg_music.mp3");
    }

    create() {
        const map = this.make.tilemap({ key: "map1" });
        const tileset = map.addTilesetImage("spritesheet(01)", "tiles");

        const backgroundLayer = map.createLayer("backgroundLayer", tileset, 0, 0);
        const groundLayer = map.createLayer("groundLayer", tileset, 0, 0);
        const platformLayer = map.createLayer("platformLayer", tileset, 0, 0);

        this.animatedTiles.init(map);

        // Player setup
        this.player = this.physics.add.sprite(50, map.heightInPixels - 50, "knight");
        this.player.setCollideWorldBounds(true);
        this.player.setScale(1.5);
        this.player.body.setGravityY(400);

        // Colliders
        groundLayer.setCollisionByExclusion([-1]);
        platformLayer.setCollisionByExclusion([-1]);

        this.physics.add.collider(this.player, groundLayer);
        this.physics.add.collider(this.player, platformLayer);

        // Sprite animations
        this.anims.create({
            key: "run_left",
            frames: this.anims.generateFrameNumbers("knight", { frames: [0, 1] }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "run_right",
            frames: this.anims.generateFrameNumbers("knight", { frames: [2, 3] }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "coin_spin",
            frames: this.anims.generateFrameNumbers("coin", { start: 0, end: 5 }),
            frameRate: 10,
            repeat: -1
        });

        // Set world bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);

        // Score UI
        this.scoreText = this.add.text(16, 16, "Score: 0", { fontSize: "12px", fill: "#fff" }).setScrollFactor(0);
        this.coinsText = this.add.text(16, 34, "Coins Collected: 0", { fontSize: "12px", fill: "#fff" }).setScrollFactor(0);
        this.keyText = this.add.text(16, 52, "Key: 0/1", { fontSize: "12px", fill: "#fff" }).setScrollFactor(0);

        this.score = 0;
        this.coinsCollected = 0;
        this.hasKey = false;
        this.lives = 3;
        this.gameOverFlag = false;
        this.gameCompleteFlag = false;

        // SFX
        this.coinSfx = this.sound.add("coinSfx", { volume: 0.05 });
        this.hurtSfx = this.sound.add("hurtSfx", { volume: 0.10 });
        this.jumpSfx = this.sound.add("jumpSfx", { volume: 0.25 });
        this.victorySfx = this.sound.add("victorySfx", { volume: 0.5 });
        this.loseSfx = this.sound.add("loseSfx", { volume: 0.10 });
        this.bgMusic = this.sound.add("bgMusic", { volume: 0.05, loop: true });
        this.bgMusic.play();

        // Hearts UI
        this.hearts = this.add.group({
            key: 'heart',
            repeat: 2,
            setXY: { x: this.cameras.main.width - 80, y: 20, stepX: 30 }
        });
        this.hearts.children.iterate(heart => {
            heart.setScale(0.5); // Adjust heart size
            heart.setScrollFactor(0);
        });

        // Add object layers
        this.createCoins(map.getObjectLayer("coinsObject").objects);
        this.createKey(map.getObjectLayer("keyObject").objects);
        this.createChests(map.getObjectLayer("chestObject").objects);
        this.createSpikes(map.getObjectLayer("spikeObject").objects);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Disable debug drawing
        this.physics.world.drawDebug = false;
    }

    update() {
        if (this.gameOverFlag || this.gameCompleteFlag) {
            this.player.setVelocityX(0);
            this.player.anims.stop();
            return;
        }

        const speed = 150;
        const jumpHeight = -250;

        this.player.setVelocityX(0);

        if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play("run_right", true);
            this.player.setFlipX(false);
        } else if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play("run_left", true);
            this.player.setFlipX(false);
        } else {
            this.player.anims.stop();
        }

        if (this.cursors.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(jumpHeight);
            this.jumpSfx.play();
        }
    }

    createCoins(coinObjects) {
        this.coins = this.physics.add.group();

        coinObjects.forEach(obj => {
            const coin = this.coins.create(obj.x - obj.width * -0.5, obj.y - obj.height * 0, "coin");
            coin.setOrigin(0.5, 1);
            coin.body.setAllowGravity(false);
            coin.anims.play("coin_spin", true);
        });

        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    }

    createKey(keyObjects) {
        this.keys = this.physics.add.group();

        keyObjects.forEach(obj => {
            const key = this.keys.create(obj.x - obj.width * -0.5, obj.y - obj.height * 0, "key");
            key.setOrigin(0.5, 1);
            key.body.setAllowGravity(false);
        });

        this.physics.add.overlap(this.player, this.keys, this.collectKey, null, this);
    }

    createChests(chestObjects) {
        this.chests = this.physics.add.staticGroup();

        chestObjects.forEach(obj => {
            const chest = this.chests.create(obj.x - obj.width * -0.5, obj.y - obj.height * 0, "chest");
            chest.setOrigin(0.5, 1);
        });

        this.physics.add.overlap(this.player, this.chests, this.openChest, null, this);
    }

    createSpikes(spikeObjects) {
        this.spikes = this.physics.add.staticGroup();

        spikeObjects.forEach(obj => {
            const spike = this.spikes.create(obj.x - obj.width * -0.5, obj.y - obj.height * 0, "spike");
            spike.setOrigin(0.5, 1);
        });

        this.physics.add.collider(this.player, this.spikes, this.hitSpike, null, this);
    }

    collectCoin(player, coin) {
        coin.destroy();

        this.coinsCollected += 1;
        this.score += 10;

        this.coinSfx.play();

        this.scoreText.setText("Score: " + this.score);
        this.coinsText.setText("Coins Collected: " + this.coinsCollected);
    }

    collectKey(player, key) {
        key.destroy();

        this.hasKey = true;
        this.keyText.setText("Key: 1/1");
        this.coinSfx.play();
    }

    openChest(player, chest) {
        if (this.hasKey) {
            this.gameCompleteFlag = true;
            const completeText = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, "txt_game_complete");
            completeText.setScrollFactor(0);
            completeText.setScale(0.30);
            this.victorySfx.play();
            this.bgMusic.stop();  // Stop background music
        } else {
            chest.setTint(0xff0000);
            this.time.addEvent({
                delay: 500,
                callback: () => {
                    chest.clearTint();
                }
            });
        }
    }

    hitSpike(player, spike) {
        if (this.canBeHurt) {
            if (this.lives > 0) {
                player.setTint(0xff0000);
                this.hurtSfx.play();

                this.lives -= 1;
                this.hearts.children.entries[this.lives].setVisible(false);

                this.time.addEvent({
                    delay: 500,
                    callback: () => {
                        player.clearTint();
                    }
                });

                if (this.lives === 0) {
                    this.gameOver();
                }
            }
            this.canBeHurt = false;
            this.time.addEvent({
                delay: 1000,  // Delay for 3 seconds
                callback: () => {
                    this.canBeHurt = true;  // Enable hurt after 3 seconds
                }
            });
        }
    }

    gameOver() {
        this.gameOverFlag = true;
        const gameOverText = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, "txt_game_over");
        gameOverText.setScrollFactor(0);
        gameOverText.setScale(0.5);
        this.bgMusic.stop();  // Stop background music
        this.loseSfx.play();
    }
}

