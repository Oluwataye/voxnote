import { ConsultationTemplate, QuestionSet } from "@/types/templates";

interface VoiceGuidedQuestions {
  currentSetIndex: number;
  currentQuestionIndex: number;
  isActive: boolean;
  template: ConsultationTemplate | null;
}

export class VoiceQuestionGuide {
  private state: VoiceGuidedQuestions = {
    currentSetIndex: 0,
    currentQuestionIndex: 0,
    isActive: false,
    template: null,
  };

  private onQuestionChange: ((question: string | null) => void) | null = null;

  constructor(onQuestionChange?: (question: string | null) => void) {
    this.onQuestionChange = onQuestionChange || null;
  }

  startGuide(template: ConsultationTemplate) {
    console.log("Starting voice-guided questions with template:", template.name);
    this.state = {
      currentSetIndex: 0,
      currentQuestionIndex: 0,
      isActive: true,
      template,
    };
    this.askCurrentQuestion();
  }

  stopGuide() {
    console.log("Stopping voice-guided questions");
    this.state.isActive = false;
    this.state.template = null;
    this.notifyQuestionChange(null);
  }

  nextQuestion() {
    if (!this.state.isActive || !this.state.template) return;

    const currentSet = this.state.template.questionSets[this.state.currentSetIndex];
    if (!currentSet) return;

    // Move to next question in current set
    if (this.state.currentQuestionIndex < currentSet.questions.length - 1) {
      this.state.currentQuestionIndex++;
      this.askCurrentQuestion();
      return;
    }

    // Move to next question set
    if (this.state.currentSetIndex < this.state.template.questionSets.length - 1) {
      this.state.currentSetIndex++;
      this.state.currentQuestionIndex = 0;
      this.askCurrentQuestion();
      return;
    }

    // All questions completed
    console.log("All questions completed");
    this.stopGuide();
  }

  previousQuestion() {
    if (!this.state.isActive || !this.state.template) return;

    // Move to previous question in current set
    if (this.state.currentQuestionIndex > 0) {
      this.state.currentQuestionIndex--;
      this.askCurrentQuestion();
      return;
    }

    // Move to previous question set
    if (this.state.currentSetIndex > 0) {
      this.state.currentSetIndex--;
      const previousSet = this.state.template.questionSets[this.state.currentSetIndex];
      this.state.currentQuestionIndex = previousSet.questions.length - 1;
      this.askCurrentQuestion();
    }
  }

  skipToNextSet() {
    if (!this.state.isActive || !this.state.template) return;

    if (this.state.currentSetIndex < this.state.template.questionSets.length - 1) {
      this.state.currentSetIndex++;
      this.state.currentQuestionIndex = 0;
      this.askCurrentQuestion();
    } else {
      this.stopGuide();
    }
  }

  getCurrentQuestion(): string | null {
    if (!this.state.isActive || !this.state.template) return null;

    const currentSet = this.state.template.questionSets[this.state.currentSetIndex];
    if (!currentSet) return null;

    return currentSet.questions[this.state.currentQuestionIndex] || null;
  }

  getCurrentCategory(): string | null {
    if (!this.state.isActive || !this.state.template) return null;

    const currentSet = this.state.template.questionSets[this.state.currentSetIndex];
    return currentSet?.category || null;
  }

  getProgress(): { current: number; total: number; percentage: number } {
    if (!this.state.template) {
      return { current: 0, total: 0, percentage: 0 };
    }

    let total = 0;
    let current = 0;

    this.state.template.questionSets.forEach((set, setIndex) => {
      total += set.questions.length;
      if (setIndex < this.state.currentSetIndex) {
        current += set.questions.length;
      } else if (setIndex === this.state.currentSetIndex) {
        current += this.state.currentQuestionIndex;
      }
    });

    return {
      current: current + 1, // +1 because we're on the current question
      total,
      percentage: total > 0 ? Math.round(((current + 1) / total) * 100) : 0,
    };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  private askCurrentQuestion() {
    const question = this.getCurrentQuestion();
    if (question) {
      console.log(`Current category: ${this.getCurrentCategory()}`);
      console.log(`Question ${this.getProgress().current}/${this.getProgress().total}: ${question}`);
      this.notifyQuestionChange(question);
    }
  }

  private notifyQuestionChange(question: string | null) {
    if (this.onQuestionChange) {
      this.onQuestionChange(question);
    }
  }
}
