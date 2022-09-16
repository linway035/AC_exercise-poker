const Symbols = [
  "https://assets-lighthouse.alphacamp.co/uploads/image/file/17989/__.png", // 黑桃
  "https://assets-lighthouse.alphacamp.co/uploads/image/file/17992/heart.png", // 愛心
  "https://assets-lighthouse.alphacamp.co/uploads/image/file/17991/diamonds.png", // 方塊
  "https://assets-lighthouse.alphacamp.co/uploads/image/file/17988/__.png", // 梅花
];

const utility = {
  getRandomNumberArray(count) {
    const number = Array.from(Array(count).keys());
    for (let index = number.length - 1; index > 0; index--) {
      let randomIndex = Math.floor(Math.random() * (index + 1));
      [number[index], number[randomIndex]] = [
        number[randomIndex],
        number[index],
      ];
    }
    return number;
  },
};

const GAME_STATE = {
  FirstCardAwaits: "FirstCardAwaits",
  SecondCardAwaits: "SecondCardAwaits",
  CardsMatchFailed: "CardsMatchFailed",
  CardsMatched: "CardsMatched",
  GameFinished: "GameFinished",
};

const view = {
  //負責生成卡片內容，包括花色和數字
  getCardContent(index) {
    const number = this.transformNumber((index % 13) + 1);
    const symbol = Symbols[Math.floor(index / 13)];
    // console.log(this);可以加這句方便理解this
    return `
    <p>${number}</p>
    <img src="${symbol}" />
    <p>${number}</p>
    `;
  },
  //負責生成卡片的div，包含dataset
  getCardElement(index) {
    return `
      <div class="card back" data-index="${index}">      
      </div>`;
  },
  //轉換A.J.Q.K
  transformNumber(number) {
    switch (number) {
      case 1:
        return "A";
      case 11:
        return "J";
      case 12:
        return "Q";
      case 13:
        return "K";
      default:
        return number;
    }
  },
  // 負責選出 #cards 並抽換內容
  displayCards(indexes) {
    const rootElement = document.querySelector("#cards");
    rootElement.innerHTML = indexes
      .map((index) => this.getCardElement(index))
      .join("");
  },
  // 翻牌 背轉正.正轉背
  flipCards(...cards) {
    //上面等同 flipCard(card) flipCards(1,2,3) cards=[1,2,3]，並新增用map的方式
    cards.map((card) => {
      if (card.classList.contains("back")) {
        // 回傳正面
        card.classList.remove("back");
        // console.log(this);可以加這句方便理解this
        card.innerHTML = this.getCardContent(Number(card.dataset.index)); //回傳是字串，為了確保運作所以Number
        return; //記得要加return來中止
      }
      // 回傳背面
      card.classList.add("back");
      card.innerHTML = null;
    });
  },
  // 配對成功長相 (亦改成用展開運算子)
  pairCards(...cards) {
    cards.map((card) => {
      card.classList.add("paired");
    });
  },
  // 顯示分數
  renderScore(score) {
    document.querySelector(".score").textContent = `Score: ${score}`;
  },
  // 顯示次數
  renderTriedTimes(times) {
    document.querySelector(
      ".tried"
    ).textContent = `You've tried: ${times} times`;
  },
  //配對失敗動畫
  appendWrongAnimation(...cards) {
    cards.map((card) => {
      card.classList.add("wrong");
      card.addEventListener(
        "animationend", //動畫結束事件
        (event) => event.target.classList.remove("wrong"),
        { once: true } //要求在事件每執行一次之後，就要卸載這個監聽器。因為同一張卡片可能會被點錯好幾次。
      );
    });
  },
  //遊戲結束
  showGameFinished() {
    const div = document.createElement("div");
    div.classList.add("completed");
    div.innerHTML = `
      <p>Complete!</p>
      <p>Score: ${model.score}</p>
      <p>You've tried: ${model.triedTimes} times</p>
    `;
    const header = document.querySelector("#header");
    header.before(div); //html程式碼寫在header前面，跟圖層無關
  },
};

const controller = {
  //初始狀態
  currentState: GAME_STATE.FirstCardAwaits,
  //顯示卡片
  generateCards() {
    view.displayCards(utility.getRandomNumberArray(52));
  },
  //依照遊戲狀態，做不同的行為
  dispatchCardAction(card) {
    if (!card.classList.contains("back")) {
      return;
    }
    switch (this.currentState) {
      case GAME_STATE.FirstCardAwaits:
        view.flipCards(card);
        model.revealedCards.push(card);
        this.currentState = GAME_STATE.SecondCardAwaits;
        break;
      case GAME_STATE.SecondCardAwaits:
        view.renderTriedTimes(++model.triedTimes); //注意++是寫在變數前面，怕寫錯就寫+=1
        view.flipCards(card);
        model.revealedCards.push(card);
        // 判斷配對是否成功
        if (model.isRevealedCardsMatched()) {
          view.renderScore((model.score += 10));
          this.currentState = GAME_STATE.CardsMatched;
          view.pairCards(...model.revealedCards);
          model.revealedCards = [];
          if (model.score === 260) {
            console.log("showGameFinished");
            this.currentState = GAME_STATE.GameFinished;
            view.showGameFinished();
            return; // 沒return會繼續後面程式碼
          }
          this.currentState = GAME_STATE.FirstCardAwaits;
        } else {
          this.currentState = GAME_STATE.CardsMatchFailed; //因為沒有寫這case(也無關break)，所以在這狀態下亂點其他卡片都不會有動作
          view.appendWrongAnimation(...model.revealedCards);
          setTimeout(this.resetCards, 1000); //注意是this.resetCards，而非this.resetCards()，多了括弧就是呼叫結果。我們要的是呼叫function
          //1秒後秒後才setTimeout，在這1秒內都還是GAME_STATE.CardsMatchFailed，因為沒有這case所以亂點不會造成有其他動作
          //注意，點開console可以發現，執行順序為 122行 --> 129~133行 --> 1秒後才setTimeout
          break;
        }
    }
    console.log("this.currentState", this.currentState);
    console.log(
      "revealedCards",
      model.revealedCards.map((card) => card.dataset.index)
    );
  },
  resetCards() {
    view.flipCards(...model.revealedCards);
    model.revealedCards = [];
    controller.currentState = GAME_STATE.FirstCardAwaits; //本來的this要改成controller
    //我們期待 this 要指向 controller，然而當我們把 resetCards 當成參數傳給 setTimeout 時，this 的對象變成了 setTimeout，而 setTimeout 又是一個由瀏覽器(Window)提供的東西，而不是我們自己定義在 controller 的函式。
  },
};

const model = {
  revealedCards: [],
  isRevealedCardsMatched() {
    return (
      this.revealedCards[0].dataset.index % 13 ===
      this.revealedCards[1].dataset.index % 13
    );
  },
  score: 0,
  triedTimes: 0,
};
controller.generateCards();

// querySelectorAll會產生一個Node List(array-like，所以不能用map)
document.querySelectorAll(".card").forEach((card) =>
  card.addEventListener("click", (event) => {
    controller.dispatchCardAction(card);
  })
);
