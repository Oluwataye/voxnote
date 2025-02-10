
// OpenAI Realtime API Event Types
export interface BaseEvent {
  type: string;
  event_id?: string;
}

export interface AudioDeltaEvent extends BaseEvent {
  type: 'response.audio.delta';
  delta: string; // base64 encoded audio data
}

export interface AudioTranscriptDeltaEvent extends BaseEvent {
  type: 'response.audio_transcript.delta';
  delta: string; // text fragment
}

export interface FunctionCallArgumentsDeltaEvent extends BaseEvent {
  type: 'response.function_call_arguments.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  delta: string;
}

export interface FunctionCallArgumentsDoneEvent extends BaseEvent {
  type: 'response.function_call_arguments.done';
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  arguments: string;
}

export interface SessionCreatedEvent extends BaseEvent {
  type: 'session.created';
  session: {
    id: string;
  };
}

export interface ResponseCreatedEvent extends BaseEvent {
  type: 'response.created';
}

export interface ResponseDoneEvent extends BaseEvent {
  type: 'response.done';
  response: {
    id: string;
    // Add other response properties as needed
  };
}

export type RealtimeEvent =
  | AudioDeltaEvent
  | AudioTranscriptDeltaEvent
  | FunctionCallArgumentsDeltaEvent
  | FunctionCallArgumentsDoneEvent
  | SessionCreatedEvent
  | ResponseCreatedEvent
  | ResponseDoneEvent;

// Session Configuration Types
export interface TurnDetectionConfig {
  type: 'server_vad';
  threshold: number;
  prefix_padding_ms: number;
  silence_duration_ms: number;
}

export interface InputAudioTranscriptionConfig {
  model: string;
}

export interface Tool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface SessionConfig {
  modalities: ('text' | 'audio')[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription: InputAudioTranscriptionConfig;
  turn_detection: TurnDetectionConfig;
  tools?: Tool[];
  tool_choice?: 'auto' | 'none';
  temperature?: number;
  max_response_output_tokens?: number | 'inf';
}

// Message Types
export interface TextMessage {
  type: 'input_text';
  text: string;
}

export interface MessageContent {
  type: 'message';
  role: 'user' | 'assistant';
  content: TextMessage[];
}

export interface MessageEvent {
  type: 'conversation.item.create';
  item: MessageContent;
}
