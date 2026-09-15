export interface ModelRequest {
  readonly requestId: string;
  readonly model: string;
  readonly input: string;
  readonly maxOutputTokens: number;
}

export interface ModelResponse {
  readonly requestId: string;
  readonly model: string;
  readonly output: string;
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number };
}

export interface ModelAdapter {
  readonly name: string;
  complete(request: ModelRequest): Promise<ModelResponse>;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateModelRequest(request: ModelRequest): void {
  if (!request.requestId.trim()) throw new ValidationError('request id is required');
  if (!request.model.trim()) throw new ValidationError('model is required');
  if (!request.input.trim()) throw new ValidationError('input is required');
  if (!Number.isSafeInteger(request.maxOutputTokens) || request.maxOutputTokens < 1 || request.maxOutputTokens > 8192) {
    throw new ValidationError('maxOutputTokens must be an integer between 1 and 8192');
  }
}

export class DeterministicTestAdapter implements ModelAdapter {
  readonly name = 'deterministic-test-adapter';

  async complete(request: ModelRequest): Promise<ModelResponse> {
    validateModelRequest(request);
    const output = `test-response:${request.input.slice(0, 120)}`;
    return {
      requestId: request.requestId,
      model: request.model,
      output,
      usage: { inputTokens: request.input.length, outputTokens: output.length },
    };
  }
}

export interface HttpTransport {
  post(url: string, body: string, headers: Readonly<Record<string, string>>): Promise<{ status: number; body: string }>;
}

export class HttpModelAdapter implements ModelAdapter {
  readonly name = 'http-model-adapter';

  constructor(
    private readonly endpoint: string,
    private readonly transport: HttpTransport,
  ) {}

  async complete(request: ModelRequest): Promise<ModelResponse> {
    validateModelRequest(request);
    const response = await this.transport.post(
      this.endpoint,
      JSON.stringify(request),
      { 'content-type': 'application/json' },
    );
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`model provider returned HTTP ${response.status}`);
    }
    const parsed = JSON.parse(response.body) as Partial<ModelResponse>;
    if (parsed.requestId !== request.requestId || typeof parsed.output !== 'string') {
      throw new Error('model provider returned an invalid response contract');
    }
    return {
      requestId: parsed.requestId,
      model: parsed.model ?? request.model,
      output: parsed.output,
      usage: parsed.usage ?? { inputTokens: 0, outputTokens: parsed.output.length },
    };
  }
}
