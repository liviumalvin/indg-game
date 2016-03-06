window.Game = {};

(function (facade) {
    "use strict";

    var cloneTemplate,
        Game;

    /**
     * cloneTemplate
     * Clones a static template
     * @param template
     * @returns {*|jQuery|HTMLElement}
     */
    cloneTemplate = function (template) {
        return $($.parseHTML(template.html())[1]);
    };


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
            1: "You",
            2: "Your friend's",
            3: "Computer"
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

        round = this;

        this.game.$board.find("[data-take]").each(function () {
            $(this).click(function () {

                if (round.game.status.finished) {
                    round.game.addStatusMessage("Game over champ, reload for another round.");
                    return false;
                }

                round.game.takeOut($(this).data("take"));
                round.game.addStatusMessage(round.getPlayerName().replace("'s", "", 'g') + " took out " + $(this).data('take') + " items");
                round.game.addStatusMessage("----");
                round.choose();
            });
        });

        this.choose();
    };

    Game.round.prototype.getPlayerName = function() {
        return this.game.players[this.currentPlayer];
    };

    Game.round.prototype.choose = function () {
        this.switchPlayer();

        if (this.game.status.out >= this.game.rules.itemsCount) {
            //The game was won
            this.game.addStatusMessage("Let us congrat " + this.getPlayerName().replace("'s", "", "g").toLowerCase() + " for winning this game");
            this.game.status.finished = true;
            return true;
        }

        this.game.addStatusMessage(this.getPlayerName() + " move");
    };

    Game.round.prototype.switchPlayer = function () {
        this.currentPlayer = this.game.playerSwitch[this.game.status.type][this.currentPlayer];
    };


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

