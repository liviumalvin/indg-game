window.Game = {};

(function (facade) {
    "use strict";

    var cloneTemplate,
        Game,
        ComputerPlayer;


    /**
     * ComputerPlayer
     * @param level
     * @constructor
     */
    ComputerPlayer = function (level) {

        this.rules = {
            faultPercentage: 100,
            aggresiveThinking: 0,
            avoid: [8, 7, 5, 6, 4, 3, 2],
            reachFor: [4, 3, 2],
            doNotAllow: [4,3,2],
            avoidPercentage: 0,
            multiplyFactor: 1.5,
            goodWill: 90,
            possibleMoves: [1,2,3]
        };

        this.aggresivity= {
            0: {
                takeMinimum: 1,
                takeMaximum: 2,
                boostAt: 0
            },
            1: {
                takeMaximum: 2,
                takeMinimum: 1,
                boostAt: 15
            },
            2: {
                takeMinimum: 2,
                takeMaximum: 3,
                boostAt: 19
            }
        };

        this.setLevel(level);
    };

    /**
     * Set computer player level of rules
     * @param level
     * @returns {boolean}
     */
    ComputerPlayer.prototype.setLevel = function (level) {

        this.level = JSON.parse(JSON.stringify(this.rules));

        if (level === 0) {
            return true;
        }

        this.level.goodWill             = Math.floor(this.level.goodWill / level);
        this.level.multiplyFactor       = this.level.multiplyFactor / level;

        //Compute fault percentage
        this.level.faultPercentage      = Math.floor(
                                            this.level.faultPercentage / (
                                                (this.level.multiplyFactor * level) * (1/(this.level.goodWill/100))
                                            )
                                        );

        //Compute aggresive thinking
        this.level.aggresiveThinking    = Math.round(
                                            (
                                                Math.floor(
                                                    this.level.aggresiveThinking + level
                                                ) - (
                                                Math.floor(
                                                    this.level.aggresiveThinking + level
                                                ) * this.level.goodWill/100)
                                            ) * this.level.multiplyFactor
                                            );

        console.log("Computer rules", this.level);
        console.table(this.level);
    };

    /**
     * Computer thinking.
     * @param game
     * @returns {*}
     */
    ComputerPlayer.prototype.think = function (game) {
        var remaining,
            willTake,
            i_will_take;

        remaining = game.rules.itemsCount - game.status.out;

        willTake = this.beAggresive();
        if (remaining < this.aggresivity[this.level.aggresiveThinking].boostAt) {
            willTake = this.aggresivity[this.level.aggresiveThinking].takeMaximum;
        }

        //Fault?
        if (this.level.faultPercentage > 60) {
            return willTake;
        }

        //Is already in reach
        if (-1 !== this.level.reachFor.indexOf(remaining)) {
            if (this.level.faultPercentage > 30) {
                willTake = remaining - 1 + Math.round(Math.random());
            } else {
                willTake = remaining - 1;
            }
        }

        if (-1 !== this.level.avoid.indexOf(remaining - willTake)) {
            var oldWillTake;

            oldWillTake = willTake;

            //Is within reach
            for (i_will_take = willTake - 1; i_will_take > 0; i_will_take -= 1) {
                console.log(i_will_take);
                if (this.level.faultPercentage > 30) {
                    return willTake;
                }

                if (-1 === this.level.avoid.indexOf(remaining - i_will_take)) {
                    willTake = i_will_take;
                }
            }

            if (oldWillTake === willTake) {
                //Go for the minimum
                willTake = 1;
            }
        }

        if (1 >= this.level.aggresiveThinking) {

            //Force the opponent to loose
            this.level.avoid.forEach(function (value) {
                if ((remaining - value) <= 3) {
                    willTake = remaining - value;
                }
            });

            if ( -1 !== this.level.doNotAllow.indexOf(remaining - willTake) ) {
                while(willTake > 0) {
                    if (-1 === this.level.doNotAllow.indexOf(remaining - willTake)) {
                        return willTake;
                    }
                    willTake --;
                }
                willTake = 1;
            }
        }

        return willTake;
    };

    /**
     * Get computer aggresiveness
     * @returns {*}
     */
    ComputerPlayer.prototype.beAggresive = function () {
        var luck,
            value;

        luck = Math.round(Math.random());

        if (luck) {
            value = this.aggresivity[this.level.aggresiveThinking].takeMinimum;
        } else {
            value = this.aggresivity[this.level.aggresiveThinking].takeMaximum;
        }

        return value;

    };

    window.C = ComputerPlayer;

    /**
     * cloneTemplate
     * Clones a static template
     * @param template
     * @returns {*|jQuery|HTMLElement}
     */
    cloneTemplate = function (template) {
        return $($.parseHTML(template.html())[1]);
    };

    //Game object
    Game = {

        //Predefined members
        uiAssets: {},
        round: null,

        templates: {
            board: $("template#gameBoard"),
            item: $("template#gameBoardItem")
        },

        /**
         * Player switch
         */
        playerSwitch: {
            single: {
                1: 3,
                3: 1
            },

            double: {
                1: 2,
                2: 1
            }
        },

        /**
         * Players
         */
        players: {
            1: "You (Player 1)",
            2: "Your friend's (Player 2)",
            3: "Computer (A.I) "
        },

        /**
         * Rules
         */
        rules: {
            itemsCount: 20,
            minStep: 1,
            maxStep: 3
        },

        /**
         * Status
         */
        status: {
            started: false,
            finished: false,
            out: 0,
            turn: 1 //by default, player 1 goes first
        },

        /**
         * Game init
         * Initializes the game platform
         */
        init: function () {
            this.$container = $(".board-holder");
            this.$board     = cloneTemplate(this.templates.board);
            this.uiAssets.modal = $('#game-mode-modal');
            this.items      = [];

            this.build();
            this.run();
        },

        /**
         * Build the game board
         */
        build: function () {
            this.__buildBoardItems();
            this.$container.append(this.$board);
        },

        /**
         *
         * @private
         * Build the board items
         */
        __buildBoardItems: function () {
            var i_item;

            for (i_item = 0; i_item < this.rules.itemsCount; i_item += 1) {
                this.items.push(cloneTemplate(this.templates.item));
            }

            this.$itemsContainer = this.$board.find(".game-board-items");
            this.items.map(function (item) {
                this.$itemsContainer.append(item);
            }.bind(this));
        },

        /**
         * Halt the board. An overlay is active
         */
        haltBoard: function () {
            this.$board.find(".halt-overlay").show();
        },

        /**
         * Unhalts the board
         */
        unhaltBoard: function () {
            this.$board.find(".halt-overlay").hide();
        },

        /**
         * Adds a status message
         * @param message
         */
        addStatusMessage: function (message) {
            this.$board.find("#statusBox").html(
                this.$board.find("#statusBox").html() +
                    message +
                    "\r\n"
            );

            this.$board.find("#statusBox").scrollTop(this.$board.find("#statusBox")[0].scrollHeight);
        },

        /**
         * State game mode.
         */
        stateGameMode: function () {
            this.uiAssets.modal.modal ({
                keyboard: false,
                backdrop: "static"
            });
        },

        /**
         * Take out items.
         * @param count
         * @returns {boolean}
         */
        takeOut: function (count) {

            if (count > this.rules.maxStep) {
                this.addStatusMessage("No more than " + this.rules.maxStep + " allowed to take out");
                return false;
            }

            if (count < this.rules.minStep) {
                this.addStatusMessage("No less than " + this.rules.maxStep + " allowed to take out");
                return false;
            }


            this.status.out += count;
            this.disableItems();

        },

        /**
         * Make the player move.
         * @param round
         * @param willTake
         * @returns {boolean}
         */
        makePlayerMove: function (round, willTake) {

            if (round.game.status.finished) {
                round.game.addStatusMessage("Game over champ, reload for another round.");
                return false;
            }

            round.game.takeOut(willTake);
            round.game.addStatusMessage(round.getPlayerName().replace("'s", "", 'g') + " took out " + willTake + " items");
            round.game.addStatusMessage("----");
            round.choose();
        },

        /**
         * Disable items
         */
        disableItems: function () {
            var i_item;

            for (i_item = 0; i_item < this.status.out; i_item += 1) {
                try {
                    this.items[i_item].addClass('out');
                } catch (e) {
                    //No more items, move on.
                }
            }
        },

        /**
         * Run the game
         * @returns {boolean}
         */
        run: function () {

            if (! this.started) {
                this.haltBoard();
                this.stateGameMode();
                return true;
            }

            return false;
        },

        /**
         * Start a new round
         */
        start: function () {
            this.started = true;
            new this.round(this);
        }
    };

    /**
     * Creates a game round.
     * @param game
     */
    Game.round = function (game) {
        var round;

        console.log("Initialized a new game round");

        this.game = game;
        this.currentPlayer = this.game.status.turn;

        this.game.addStatusMessage("Starting a new game");
        this.game.unhaltBoard();

        this.computer = new ComputerPlayer(100); //Level 1 computer

        round = this;

        this.game.$board.find("[data-take]").each(function () {
            $(this).click(function () {
                round.game.makePlayerMove(round, $(this).data('take'));
            });
        });

        this.choose();
    };

    /**
     * Retrieve player caller
     * @returns {*}
     */
    Game.round.prototype.getPlayerName = function() {
        return this.game.players[this.currentPlayer];
    };

    /**
     * Decision maker
     * @returns {boolean}
     */
    Game.round.prototype.choose = function () {

        //Switch player
        this.switchPlayer();

        if (this.game.status.out >= this.game.rules.itemsCount) {
            //The game was won
            this.game.addStatusMessage("Let us congrat " + this.getPlayerName().replace("'s", "", "g").toLowerCase() + " for winning this game");
            this.game.status.finished = true;
            return true;
        }

        this.game.addStatusMessage(this.getPlayerName() + " move");

        if (3 === this.currentPlayer) {
            this.game.makePlayerMove(this, this.computer.think(this.game));
        }
    };

    /**
     * Switch player
     */
    Game.round.prototype.switchPlayer = function () {
        this.currentPlayer = this.game.playerSwitch[this.game.status.type][this.currentPlayer];
    };

    /**
     * Public by facade.
     * @param type
     * @returns {boolean}
     */
    facade.setMode = function (type) {

        if (Game.status.started) {
            return false;
        }

        Game.status.type = type;
        Game.start();
    };


    $(document).ready(function () {
        Game.init();
    });
}(Game));

