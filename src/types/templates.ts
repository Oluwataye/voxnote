export interface ConsultationTemplate {
  id: string;
  name: string;
  description: string;
  specialty: string;
  tags: string[];
  questionSets: QuestionSet[];
  icon?: string;
}

export interface QuestionSet {
  category: string;
  questions: string[];
}

export const CONSULTATION_TEMPLATES: ConsultationTemplate[] = [
  {
    id: "cardiology",
    name: "Cardiology Consultation",
    description: "Comprehensive cardiovascular assessment",
    specialty: "Cardiology",
    tags: ["cardiology", "heart", "cardiovascular"],
    icon: "Heart",
    questionSets: [
      {
        category: "Chief Complaint",
        questions: [
          "What brings you in today?",
          "When did your symptoms start?",
          "How severe is the chest pain/discomfort on a scale of 1-10?"
        ]
      },
      {
        category: "Cardiac History",
        questions: [
          "Do you have any history of heart disease?",
          "Have you ever had a heart attack or stroke?",
          "Do you have high blood pressure or high cholesterol?",
          "Are you taking any cardiac medications?"
        ]
      },
      {
        category: "Risk Factors",
        questions: [
          "Do you smoke or have you smoked in the past?",
          "Do you have diabetes?",
          "Is there a family history of heart disease?"
        ]
      }
    ]
  },
  {
    id: "pediatrics",
    name: "Pediatric Consultation",
    description: "Child health and development assessment",
    specialty: "Pediatrics",
    tags: ["pediatrics", "children", "infant"],
    icon: "Baby",
    questionSets: [
      {
        category: "Chief Complaint",
        questions: [
          "What concerns bring your child in today?",
          "When did the symptoms begin?",
          "Has your child had a fever?"
        ]
      },
      {
        category: "Development",
        questions: [
          "How is your child's eating and sleeping?",
          "Are developmental milestones being met?",
          "Any concerns about growth or behavior?"
        ]
      },
      {
        category: "Vaccination History",
        questions: [
          "Is your child up to date with vaccinations?",
          "Any previous adverse reactions to vaccines?"
        ]
      }
    ]
  },
  {
    id: "general",
    name: "General Medicine",
    description: "Standard medical consultation",
    specialty: "General Practice",
    tags: ["general", "primary care"],
    icon: "Stethoscope",
    questionSets: [
      {
        category: "Chief Complaint",
        questions: [
          "What brings you in today?",
          "How long have you been experiencing these symptoms?",
          "Have you noticed any triggers or patterns?"
        ]
      },
      {
        category: "Medical History",
        questions: [
          "Do you have any chronic medical conditions?",
          "Are you currently taking any medications?",
          "Any allergies to medications?"
        ]
      },
      {
        category: "Lifestyle",
        questions: [
          "Do you smoke or drink alcohol?",
          "How would you describe your diet and exercise habits?",
          "Are you experiencing any stress?"
        ]
      }
    ]
  },
  {
    id: "orthopedics",
    name: "Orthopedic Consultation",
    description: "Musculoskeletal assessment",
    specialty: "Orthopedics",
    tags: ["orthopedics", "bones", "joints", "musculoskeletal"],
    icon: "Bone",
    questionSets: [
      {
        category: "Chief Complaint",
        questions: [
          "What part of your body is bothering you?",
          "When did the pain or injury occur?",
          "Was there a specific incident or trauma?"
        ]
      },
      {
        category: "Pain Assessment",
        questions: [
          "On a scale of 1-10, how would you rate your pain?",
          "Does the pain radiate anywhere?",
          "What makes the pain better or worse?"
        ]
      },
      {
        category: "Function",
        questions: [
          "How does this affect your daily activities?",
          "Have you noticed any swelling or bruising?",
          "Any numbness or tingling?"
        ]
      }
    ]
  },
  {
    id: "dermatology",
    name: "Dermatology Consultation",
    description: "Skin condition assessment",
    specialty: "Dermatology",
    tags: ["dermatology", "skin", "rash"],
    icon: "Sparkles",
    questionSets: [
      {
        category: "Chief Complaint",
        questions: [
          "What skin concern brings you in today?",
          "When did you first notice this issue?",
          "Has it changed in appearance over time?"
        ]
      },
      {
        category: "Symptoms",
        questions: [
          "Is there any itching, pain, or burning?",
          "Have you noticed any discharge or bleeding?",
          "Does anything make it better or worse?"
        ]
      },
      {
        category: "History",
        questions: [
          "Have you had similar issues in the past?",
          "Any new soaps, lotions, or exposures?",
          "Do you have a history of allergies or eczema?"
        ]
      }
    ]
  },
  {
    id: "psychiatry",
    name: "Psychiatric Consultation",
    description: "Mental health assessment",
    specialty: "Psychiatry",
    tags: ["psychiatry", "mental health", "psychology"],
    icon: "Brain",
    questionSets: [
      {
        category: "Chief Complaint",
        questions: [
          "What brings you in today?",
          "How long have you been experiencing these concerns?",
          "What prompted you to seek help now?"
        ]
      },
      {
        category: "Mental Status",
        questions: [
          "How has your mood been recently?",
          "How are you sleeping?",
          "Have you noticed changes in your appetite or energy?"
        ]
      },
      {
        category: "Safety Assessment",
        questions: [
          "Have you had thoughts of harming yourself or others?",
          "Do you have a support system?",
          "Are you currently taking any psychiatric medications?"
        ]
      }
    ]
  }
];
