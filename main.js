/* blow-up-x (C) 2022, Diogo Neves<ndiogo778@gmail.com>. Licensed under the MIT license */
(function () {
  var MAX_FRAGMENTS_EXPLOSION = 20;
  var DISTANCE_BETWEEN_FRAGMENTS = 300;
  var TIME_TO_ADD_THE_SHOOTER = 500;
  var EXPLOSIVES_SHOOTER_OBJECTS = [];

  /* DOM Elements */

  var SHOOTERS_BASE_CONTAINER = document.getElementById("shooters-base");
  var GAME_BACKGROUND_ANIMATION_CONTAINER = document.getElementById(
    "game-background-animation"
  );

  var GAME_CONTACTS_CONTAINER = document.getElementById("game-contacts");

  var GAME_RESULT_CONTAINER = document.getElementById("game-result");
  var GAME_PAUSED_CONTAINER = document.getElementById("game-paused");
  var GAME_PRESENTATION_CONTAINER =
    document.getElementById("game-presentation");
  var GAME_CONTAINER = document.getElementById("game-running");

  var START_GAME_BUTTON = document.getElementById("start-game-button");
  var PAUSE_GAME_BUTTON = document.getElementById("pause-game-button");
  var RESTART_GAME_BUTTON = document.getElementById("game-button-restart");

  var SCORE_ELEMENT = document.getElementById("game-score-value");

  /** 'presentation' | 'playing' | 'paused' | 'over' */
  var gameState = "presentation";
  var gameScore = 0;

  wS().newObservedProperty("Percent", function (v, p, e) {
    var value = "";
    if (v === "100%") var value = Math.round(p).toString() + "%";
    return (e.textContent = value);
  });

  function msToS(ms) {
    return (ms % 60000) / 1000;
  }

  function getColorToFragments() {
    var hue = Math.round(Math.random() * 360);
    return "hsl(" + hue + ", 100%, 60%)";
  }

  function getExplosiveTranslate() {
    var innerHeight = window.innerHeight;
    var innerWidth = window.innerWidth;

    var maxY = 500;

    var positiveOrNegative = Math.random() > 0.5 ? true : false;

    var explosiveReachY = Math.min(maxY, innerHeight);

    var translateYValue = -Math.max(
      explosiveReachY * Math.random(),
      SHOOTERS_BASE_CONTAINER.offsetHeight + 300
    );

    var translateXValue = (innerWidth / 100) * (Math.random() * 25);
    return {
      y: translateYValue,
      x: positiveOrNegative ? translateXValue : -translateXValue,
    };
  }

  function hiddenExplosive(explosiveObject) {
    explosiveObject.explosive.style.border = "";
    explosiveObject.explosive.style.backgroundColor = "=";
    explosiveObject.explosive.style.height = "";
    explosiveObject.explosive.style.width = "";
    explosiveObject.explosive.style.display = "none";
  }
  function hiddenExplosiveMessage(explosiveObject) {
    explosiveObject.explosiveMessages.style.display = "none";
  }

  function hiddenFragment(fragment) {
    fragment.style.cssText = "";
    fragment.style.display = "none";
  }
  function explosiveMessageAnimation(explosiveObject) {
    return explosiveObject
      .animationCreator(
        explosiveObject.explosiveMessages,
        getDurationAccordingToGameScore(gameScore)
      )
      .set("opacity", 1)
      .$("Percent", ["0%", "100%"]);
  }

  function explosiveAnimation(explosiveObject, backgroundColor) {
    return explosiveObject
      .animationCreator(explosiveObject.explosive)
      .set("backgroundColor", backgroundColor)(
      "rotate",
      Math.random() * 360 + 100,
      {
        targets: explosiveObject.explosive,
      }
    );
  }

  function explosiveContainerAnimation(explosiveObject, explosiveObjectIndex) {
    var translate = getExplosiveTranslate();

    return explosiveObject.animationCreator(
      explosiveObject.explosiveContainer,
      {
        delay:
          explosiveObjectIndex === 0 ? Math.random() : explosiveObjectIndex / 2,
      }
    )({ translateY: translate.y, scale: [0, 1] }, "easeOutSine")(
      "translateX",
      translate.x,
      "easeInQuad"
    );
  }

  function fragmentAnimation(animationCreator, fragmentElement, fragmentIndex) {
    return animationCreator(fragmentElement, "easeInSine", {
      delay: Math.random(),
      dur: 2,
      autoPlay: false,
    })({
      translateY: Math.cos(fragmentIndex) * DISTANCE_BETWEEN_FRAGMENTS,
      translateX: Math.sin(fragmentIndex) * DISTANCE_BETWEEN_FRAGMENTS,
      opacity: 0,
    });
  }

  function animateFragments(
    explosiveObject,
    backgroundColor,
    callbackCompletedAllFragmentsAnimation
  ) {
    var explosiveElement = explosiveObject.explosive;
    var countAnimatedFragments = 0;

    function checkAmountOfAnimatedFragments(fragment) {
      hiddenFragment(fragment);
      countAnimatedFragments += 1;

      if (countAnimatedFragments >= MAX_FRAGMENTS_EXPLOSION) {
        explosiveObject.explosiveContainer.style.cssText = "";
        explosiveElement.style.cssText = "";

        hiddenExplosive(explosiveObject);
        countAnimatedFragments = 0;
        callbackCompletedAllFragmentsAnimation();
      }
    }

    [].slice
      .call(explosiveObject.fragments)
      .forEach(function (fragment, fragmentIndex) {
        fragment.style.display = "";

        fragmentAnimation(
          explosiveObject.animationCreator,
          fragment,
          fragmentIndex
        )
          .on("ready", function () {
            explosiveObject.explosive.style.display = "";
            explosiveObject.explosive.style.border = "0";
            explosiveObject.explosive.style.height = "0px";
            explosiveObject.explosive.style.width = "0px";
            explosiveObject.explosive.style.backgroundColor = "transparent";
            this.set("backgroundColor", backgroundColor);
          })
          .on("end", function () {
            checkAmountOfAnimatedFragments(fragment);
          })
          .load();
      });
  }

  function restartAnimateExplosives(explosivesShooterObject) {
    animateExplosives(resetExplosivesShooterObject(explosivesShooterObject));
  }

  function animateExplosives(explosivesShooterObject) {
    var allowedShots = explosivesShooterObject.allowedShots;
    var countAnimatedExplosives = 0;
    explosivesShooterObject.explosivesShooter.style.opacity = "1";
    if (explosivesShooterObject.isFirstShot) {
      explosivesShooterObject.animateAppendShooter().on("end", function () {
        explosivesShooterObject.isFirstShot = false;
        animateExplosives(explosivesShooterObject);
      });
      return;
    }

    for (var index = 0; index < allowedShots; index++) {
      /* Using the anonymous function to maintain values.*/
      (function () {
        var explosiveObject = explosivesShooterObject.explosives[index];
        var explosiveObjectindex = index;
        var defaultBackgroundColor = getColorToFragments();

        animateFragments(explosiveObject, defaultBackgroundColor, function () {
          if (explosiveObject.wasClicked) {
            countAnimatedExplosives += 1;
            if (countAnimatedExplosives >= allowedShots) {
              restartAnimateExplosives(explosivesShooterObject);
            }
          }
        });

        explosiveContainerAnimation(explosiveObject, explosiveObjectindex)
          .on("start", function () {
            explosivesShooterObject.animateShooter.restart();
            explosiveObject.explosive.style.display = "";
            explosiveAnimation(explosiveObject, defaultBackgroundColor);
          })
          .on("end", function () {
            explosiveObject.explosiveMessages.style.display = "";

            explosiveMessageAnimation(explosiveObject).on("end", function () {
              if (!explosiveObject.wasClicked) {
                gameTaskNotCompleted(this, explosiveObject);
              }
            })("borderColor", ["#21217e", "#ffff00", "#7c0101"])(
              "scale",
              [1, 1.5, 1],
              {
                dur: 0.8,
                loop: true,
              }
            );
          });
      })();
    }
  }

  function pushExplosive(explosivesShooterObject) {
    explosivesShooterObject.allowedShots += 1;

    var explosivesShooter = explosivesShooterObject.explosivesShooter;
    var animationCreator = wS().new();

    var explosiveContainer = document.createElement("div");
    var explosiveMessages = document.createElement("button");
    var explosive = document.createElement("div");
    var fragments = [];

    explosive.style.display = "none";

    for (var i = 0; i < MAX_FRAGMENTS_EXPLOSION; i++) {
      var span = document.createElement("span");
      fragments.push(span);
      explosive.appendChild(span);
    }

    explosiveContainer.className = "explosive-container";
    explosiveMessages.className = "explosive-messages";
    explosive.className = "explosive";

    explosiveContainer.appendChild(explosiveMessages);
    explosiveContainer.appendChild(explosive);

    explosivesShooter.appendChild(explosiveContainer);

    var explosiveObject = {
      explosiveContainer: explosiveContainer,
      explosiveMessages: explosiveMessages,
      explosive: explosive,
      fragments: fragments,
      fragmentsAnimationCreator: (function () {
        var fragmentsAnimationCreator = wS().new();
        for (var i = 0; i < MAX_FRAGMENTS_EXPLOSION; i++) {
          fragmentAnimation(fragmentsAnimationCreator, fragments[i], i);
        }
        return fragmentsAnimationCreator;
      })(),
      animationCreator: animationCreator,
      wasClicked: false,
    };

    explosiveContainer.addEventListener("click", function () {
      playerHasCompletedTheTask(explosiveObject);
    });

    explosiveContainer.addEventListener("mousedown", function () {
      playerHasCompletedTheTask(explosiveObject);
    });

    explosiveContainer.addEventListener("pointerdown", function () {
      playerHasCompletedTheTask(explosiveObject);
    });

    explosivesShooterObject.explosives.push(explosiveObject);

    return explosivesShooterObject;
  }

  function resetExplosivesShooterObject(explosivesShooterObject) {
    explosivesShooterObject.explosives.forEach(function (explosiveObject) {
      explosiveObject.animationCreator.destroy(true);
      explosiveObject.wasClicked = false;

      explosiveObject.explosive.style.cssText = "";
      explosiveObject.explosive.style.display = "none";

      explosiveObject.explosiveMessages.style.cssText = "";
      explosiveObject.explosiveMessages.style.display = "none";
      explosiveObject.fragments.forEach((fragment) => {
        hiddenFragment(fragment);
      });
    });
    return explosivesShooterObject;
  }

  function newExplosivesShooterObject() {
    var explosivesShooter = document.createElement("div");

    explosivesShooter.style.opacity = "0";

    explosivesShooter.className = "explosives-shooter";

    SHOOTERS_BASE_CONTAINER.appendChild(explosivesShooter);

    return {
      isFirstShot: true,
      allowedShots: 0,
      explosivesShooter: explosivesShooter,
      explosives: [],
      animateAppendShooter: function () {
        return wS(
          explosivesShooter,
          msToS((TIME_TO_ADD_THE_SHOOTER / 100) * 85)
        ).set("translateY", 50)("translateY", 0);
      },
      animateShooter: wS(explosivesShooter, 0.5, false)(
        "translateY",
        [0, 20, 0],
        "easeOutCubic"
      ),
    };
  }

  function showGameScore() {
    var value = gameScore + "x";
    SCORE_ELEMENT.textContent = value;
    var blockScoreSetIntervalId = setInterval(function () {
      if (gameState === "over") {
        if (SCORE_ELEMENT.textContent !== value) {
          SCORE_ELEMENT.textContent = value;
        }
      } else {
        clearInterval(blockScoreSetIntervalId);
      }
    }, 13);
  }

  function resumeGame() {
    gameState = "playing";
    GAME_CONTACTS_CONTAINER.style.display = "none";

    wS().all.forEach(function (creator) {
      creator.resume();
    });
    GAME_PAUSED_CONTAINER.style.display = "none";
  }
  function pauseGame() {
    gameState = "paused";
    GAME_CONTACTS_CONTAINER.style.display = "";

    wS().all.forEach(function (creator) {
      creator.pause();
    });
    GAME_PAUSED_CONTAINER.style.display = "block";
  }

  function restartGame() {
    GAME_CONTACTS_CONTAINER.style.display = "none";

    gameState = "playing";
    EXPLOSIVES_SHOOTER_OBJECTS.forEach(function (explosivesShooterObject) {
      explosivesShooterObject.explosivesShooter.style.cssText = "";
      explosivesShooterObject.explosivesShooter.style.opacity = "0";
      explosivesShooterObject.allowedShots = 1;
      explosivesShooterObject.isFirstShot = true;
      resetExplosivesShooterObject(explosivesShooterObject);
    });

    gameScore = 0;
    GAME_RESULT_CONTAINER.style.display = "none";
    gameBackgroundAnimation.cancel();
    animateExplosives(EXPLOSIVES_SHOOTER_OBJECTS[0]);
  }

  var gameBackgroundAnimation = (function () {
    GAME_BACKGROUND_ANIMATION_CONTAINER.style.display = "none";

    var backgroundColor = getColorToFragments();
    var animationPerformer = wS({}, "easeInSine", {
      dur: 3,
      loop: true,
      autoPlay: false,
    });
    var fragments = [];
    for (
      var fragmentIndex = 0;
      fragmentIndex < MAX_FRAGMENTS_EXPLOSION;
      fragmentIndex++
    ) {
      var fragmentElement = document.createElement("span");

      fragmentElement.style.backgroundColor = backgroundColor;

      GAME_BACKGROUND_ANIMATION_CONTAINER.appendChild(fragmentElement);

      fragments.push(fragmentElement);

      animationPerformer(
        {
          translateY: Math.cos(fragmentIndex) * DISTANCE_BETWEEN_FRAGMENTS,
          translateX: Math.sin(fragmentIndex) * window.innerWidth,
        },
        {
          delay: Math.random(),
          targets: fragmentElement,
        }
      );
    }
    animationPerformer.load();
    return {
      restart: function () {
        GAME_BACKGROUND_ANIMATION_CONTAINER.style.display = "";
        var backgroundColor = getColorToFragments();
        for (
          var fragmentIndex = 0;
          fragmentIndex < fragments.length;
          fragmentIndex++
        ) {
          var fragmentElement = fragments[fragmentIndex];
          fragmentElement.style.backgroundColor = backgroundColor;
        }
        animationPerformer.restart();
      },
      cancel: function () {
        GAME_BACKGROUND_ANIMATION_CONTAINER.style.display = "none";
        animationPerformer.cancel();
      },
    };
  })();

  function startGame() {
    // document.documentElement.requestFullscreen();

    if (gameState === "presentation") {
      GAME_CONTACTS_CONTAINER.style.display = "none";
      GAME_PRESENTATION_CONTAINER.style.display = "none";
      GAME_CONTAINER.style.opacity = "";

      gameBackgroundAnimation.cancel();

      gameState = "playing";
      var shooterLeft = newExplosivesShooterObject();
      var shooterCenter = pushExplosive(newExplosivesShooterObject());
      var shooterRight = newExplosivesShooterObject();

      EXPLOSIVES_SHOOTER_OBJECTS.push(shooterCenter, shooterLeft, shooterRight);
      animateExplosives(shooterCenter);
    }
  }

  function gameOverMessage() {
    if (gameState !== "over") {
      gameState = "over";
      GAME_RESULT_CONTAINER.style.display = "block";

      EXPLOSIVES_SHOOTER_OBJECTS.forEach(function (explosivesShooterObject) {
        resetExplosivesShooterObject(explosivesShooterObject);
      });
      RESTART_GAME_BUTTON.focus();
      wS(".game-result-value", 0.5, "easeOutSine")("width", "100%");
      showGameScore();
      gameBackgroundAnimation.restart();
    }
  }

  function playerHasCompletedTheTask(explosiveObject) {
    if (gameState === "playing" && !explosiveObject.wasClicked) {
      explosiveObject.wasClicked = true;

      gameScore += 1;

      hiddenExplosiveMessage(explosiveObject);
      hiddenExplosive(explosiveObject);

      /* Performs animation of the fragments. */
      explosiveObject.animationCreator.play();
      gameStages(gameScore);
    }
  }
  function gameTaskNotCompleted(performer, explosiveObject) {
    var setTimeoutId = setTimeout(function () {
      clearTimeout(setTimeoutId);

      hiddenExplosiveMessage(explosiveObject);
      hiddenExplosive(explosiveObject);

      performer.destroy(true);

      if (!explosiveObject.wasClicked) {
        gameOverMessage(explosiveObject);
      }
    }, /* Extra time for the player. */ 300);
  }
  function getDurationAccordingToGameScore() {
    if (gameScore > 40) {
      return 2;
    }
    return 2.5;
  }

  function gameStages(gameScore) {
    if (gameScore === 3 || gameScore === 6) {
      var length = EXPLOSIVES_SHOOTER_OBJECTS.length;
      for (let index = 0; index < length; index++) {
        const o = EXPLOSIVES_SHOOTER_OBJECTS[index];
        if (o.isFirstShot) {
          animateExplosives(pushExplosive(o));
          break;
        }
      }
    }

    if (gameScore === 1 || gameScore === 20) {
      pushExplosive(EXPLOSIVES_SHOOTER_OBJECTS[0]);
    }
    if (gameScore === 10 || gameScore === 25) {
      pushExplosive(EXPLOSIVES_SHOOTER_OBJECTS[1]);
    }
    if (gameScore === 15 || gameScore === 35) {
      pushExplosive(EXPLOSIVES_SHOOTER_OBJECTS[2]);
    }
  }

  (function gamePresentation() {
    START_GAME_BUTTON.focus();
    GAME_CONTAINER.style.opacity = "0";
    gameBackgroundAnimation.restart();
  })();

  document.addEventListener("keyup", function (e) {
    var code = e.code || e.keyCode;
    if (code === 32 || code === "Space") {
      switch (gameState) {
        case "presentation":
          startGame();
          break;
        case "over":
          restartGame();
          break;
        case "paused":
          resumeGame();
          break;
        case "playing":
          pauseGame();
          break;
        default:
          break;
      }
    }
  });

  PAUSE_GAME_BUTTON.addEventListener("click", pauseGame);
  GAME_PAUSED_CONTAINER.addEventListener("click", resumeGame);
  RESTART_GAME_BUTTON.addEventListener("click", restartGame);
  START_GAME_BUTTON.addEventListener("click", startGame);
})();
