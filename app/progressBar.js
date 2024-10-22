
/**
 * ProgressBar Class
 *
 * A customizable progress bar that can be easily integrated into any component.
 * It allows for dynamic updating of progress, setting solved state, and resetting.
 *
 * @class ProgressBar
 */
class ProgressBar {
    /**
     * Creates an instance of ProgressBar.
     * @param {HTMLElement} element - The DOM element to render the progress bar.
     * @param {number} totalSteps - The total number of steps for completion.
     * @param {string} solvedColor - The color to display when the progress is complete.
     * @param {number} [currentStep=0] - The initial current step (default is 0).
     */
    constructor(element, totalSteps, solvedColor, currentStep = 0) {
      this.element = element;
      this.totalSteps = totalSteps;
      this.currentStep = currentStep;
      this.solvedColor = solvedColor;
      this.isSolved = false;
      this.render();
    }
  
    /**
     * Updates the current step of the progress bar.
     * If the new step equals totalSteps, it automatically sets the solved state.
     * @param {number} step - The new current step.
     */
    updateStep(step) {
      this.currentStep = Math.min(step, this.totalSteps);
      if (this.currentStep === this.totalSteps) {
        this.setSolved(true);
      }
      this.render();
    }
  
    /**
     * Sets the solved state of the progress bar.
     * @param {boolean} solved - Whether the progress is solved or not.
     */
    setSolved(solved) {
      this.isSolved = solved;
      this.render();
    }
  
    /**
     * Resets the progress bar to its initial state.
     */
    reset() {
      this.currentStep = 0;
      this.isSolved = false;
      this.render();
    }
  
    // Private method
    render() {
      const progress = (this.currentStep / this.totalSteps) * 100;
      this.element.style.width = `${progress}%`;
      this.element.style.backgroundColor = this.isSolved ? this.solvedColor : '';
    }
  }
  
  // Export the ProgressBar class
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressBar;
  }