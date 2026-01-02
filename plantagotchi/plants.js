const plants = {
  bean: {
    id: "bean",
    stages: ["seed", "sprout", "plant", "flower", "fruit"],
    optimal: {
      water: [40, 70],
      light: [60, 90],
      temp: [18, 26],
      fertilizers: ["P", "K"]
    }
  },

  rose: {
    id: "rose",
    stages: ["seed", "sprout", "plant", "flower", "fruit"],
    optimal: {
      water: [50, 70],
      light: [70, 90],
      temp: [18, 25],
      fertilizers: ["N", "P", "K"]
    }
  },

  mint: {
    id: "mint",
    stages: ["seed", "sprout", "plant", "flower", "fruit"],
    optimal: {
      water: [60, 85],
      light: [40, 60],
      temp: [16, 24],
      fertilizers: ["N", "K"]
    }
  }
};
