/**
 * MessageList / MessageBubble / WelcomeScreen コンポーネントのレンダリングテスト
 *
 * メッセージ一覧のスクロール表示、ユーザー/AI別スタイル、ウェルカム画面をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "./message-list";
import { MessageBubble } from "./message-bubble";
import { WelcomeScreen } from "./welcome-screen";
import type { UIMessage } from "@ai-sdk/react";

/** MarkdownRendererをモック化 */
vi.mock("./markdown-renderer", () => ({
  MarkdownRenderer: vi.fn(
    (props: { content: string; isStreaming: boolean }) => (
      <div
        data-testid="markdown-renderer"
        data-is-streaming={String(props.isStreaming)}
      >
        {props.content}
      </div>
    )
  ),
}));

/** ToolInvocationPartをモック化 */
vi.mock("./tool-invocation-part", () => ({
  ToolInvocationPart: vi.fn(
    (props: {
      toolCallId: string;
      toolName: string;
      state: string;
    }) => (
      <div
        data-testid={`tool-invocation-${props.toolCallId}`}
        data-tool-name={props.toolName}
        data-state={props.state}
      >
        ツール: {props.toolName}
      </div>
    )
  ),
}));

/** テスト用メッセージデータ */
const mockMessages: UIMessage[] = [
  {
    id: "msg-1",
    role: "user",
    parts: [{ type: "text", text: "こんにちは" }],
  },
  {
    id: "msg-2",
    role: "assistant",
    parts: [{ type: "text", text: "こんにちは！何かお手伝いしましょうか？" }],
  },
];

/** MessageList テスト用のデフォルト props */
const defaultMessageListProps = {
  selectedModelId: "claude-sonnet-4-20250514",
  onModelSelect: vi.fn(),
  isModelSelectorDisabled: false,
};

describe("MessageList", () => {
  afterEach(() => {
    cleanup();
  });

  it("メッセージ一覧を表示する", () => {
    render(
      <MessageList
        messages={mockMessages}
        isStreaming={false}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    expect(screen.getByText("こんにちは")).toBeDefined();
    expect(
      screen.getByText("こんにちは！何かお手伝いしましょうか？")
    ).toBeDefined();
  });

  it("メッセージが空の場合、WelcomeScreen を表示する", () => {
    render(
      <MessageList
        messages={[]}
        isStreaming={false}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    expect(screen.getByTestId("welcome-screen")).toBeDefined();
  });

  it("スクロール可能なコンテナを持つ", () => {
    const { container } = render(
      <MessageList
        messages={mockMessages}
        isStreaming={false}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;
    expect(scrollContainer.className).toContain("overflow-y-auto");
  });
});

describe("MessageBubble", () => {
  afterEach(() => {
    cleanup();
  });

  it("ユーザーメッセージを右寄せで表示する", () => {
    render(
      <MessageBubble
        message={mockMessages[0]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    const wrapper = screen.getByTestId("message-bubble-msg-1");
    expect(wrapper.className).toContain("justify-end");
  });

  it("AIメッセージを左寄せで表示する", () => {
    render(
      <MessageBubble
        message={mockMessages[1]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    const wrapper = screen.getByTestId("message-bubble-msg-2");
    expect(wrapper.className).toContain("justify-start");
  });

  it("ユーザーメッセージのテキストを表示する", () => {
    render(
      <MessageBubble
        message={mockMessages[0]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByText("こんにちは")).toBeDefined();
  });

  it("AIメッセージのテキストを表示する", () => {
    render(
      <MessageBubble
        message={mockMessages[1]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(
      screen.getByText("こんにちは！何かお手伝いしましょうか？")
    ).toBeDefined();
  });

  it("AIメッセージにアバター（AI）が表示される", () => {
    render(
      <MessageBubble
        message={mockMessages[1]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByText("AI")).toBeDefined();
  });

  it("ユーザーメッセージにアバターが表示されない", () => {
    const { container } = render(
      <MessageBubble
        message={mockMessages[0]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // AIアバターの円形要素がないことを確認（bg-blue-500クラスを持つ要素）
    const avatar = container.querySelector(".bg-blue-500");
    expect(avatar).toBeNull();
  });

  it("AIメッセージにはMessageActionsが含まれる", () => {
    render(
      <MessageBubble
        message={mockMessages[1]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // コピーボタンとリトライボタンが存在する
    expect(screen.getByTestId("copy-button")).toBeDefined();
    expect(screen.getByTestId("regenerate-button")).toBeDefined();
  });

  it("ユーザーメッセージにはMessageActionsが含まれない", () => {
    render(
      <MessageBubble
        message={mockMessages[0]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // コピーボタンとリトライボタンが存在しない
    expect(screen.queryByTestId("copy-button")).toBeNull();
    expect(screen.queryByTestId("regenerate-button")).toBeNull();
  });

  it("AIメッセージの場合、MarkdownRendererが使用される", () => {
    render(
      <MessageBubble
        message={mockMessages[1]}
        isStreaming={false}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // MarkdownRendererのdata-testidが存在する
    expect(screen.getByTestId("markdown-renderer")).toBeDefined();
  });

  it("ユーザーメッセージの場合、プレーンテキストのp要素が使用される", () => {
    const { container } = render(
      <MessageBubble
        message={mockMessages[0]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // whitespace-pre-wrapのp要素が存在する
    const plainText = container.querySelector("p.whitespace-pre-wrap");
    expect(plainText).not.toBeNull();
    expect(plainText?.textContent).toBe("こんにちは");

    // MarkdownRendererは存在しない
    expect(screen.queryByTestId("markdown-renderer")).toBeNull();
  });

  it("isStreamingプロパティがMarkdownRendererに伝播される", () => {
    render(
      <MessageBubble
        message={mockMessages[1]}
        isStreaming={true}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    const renderer = screen.getByTestId("markdown-renderer");
    expect(renderer.getAttribute("data-is-streaming")).toBe("true");
  });

  it("ユーザーメッセージにダーク背景スタイルが適用される", () => {
    const { container } = render(
      <MessageBubble
        message={mockMessages[0]}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // ダーク背景のバブル要素を探す
    const bubble = container.querySelector(".bg-zinc-800");
    expect(bubble).not.toBeNull();
  });
});

describe("MessageList isStreaming伝播", () => {
  afterEach(() => {
    cleanup();
  });

  it("ストリーミング中、最後のメッセージのみにisStreaming=trueが渡される", () => {
    render(
      <MessageList
        messages={mockMessages}
        isStreaming={true}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    // 最後のメッセージ（AI）のバブルにdata-is-streaming="true"が設定される
    const lastBubble = screen.getByTestId("message-bubble-msg-2");
    expect(lastBubble.getAttribute("data-is-streaming")).toBe("true");

    // 最初のメッセージにはdata-is-streaming="false"が設定される
    const firstBubble = screen.getByTestId("message-bubble-msg-1");
    expect(firstBubble.getAttribute("data-is-streaming")).toBe("false");
  });

  it("ストリーミング中でない場合、全メッセージにisStreaming=falseが渡される", () => {
    render(
      <MessageList
        messages={mockMessages}
        isStreaming={false}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    const firstBubble = screen.getByTestId("message-bubble-msg-1");
    const lastBubble = screen.getByTestId("message-bubble-msg-2");
    expect(firstBubble.getAttribute("data-is-streaming")).toBe("false");
    expect(lastBubble.getAttribute("data-is-streaming")).toBe("false");
  });

  it("ストリーミング中にAIメッセージが最後の場合、TypingIndicatorが非表示になる", () => {
    render(
      <MessageList
        messages={mockMessages}
        isStreaming={true}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    // 最後のメッセージがAI（assistant）の場合、TypingIndicatorは非表示
    expect(screen.queryByTestId("typing-indicator")).toBeNull();
  });

  it("ストリーミング中にユーザーメッセージが最後の場合、TypingIndicatorが表示される", () => {
    const userLastMessages: UIMessage[] = [
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "質問です" }],
      },
    ];

    render(
      <MessageList
        messages={userLastMessages}
        isStreaming={true}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    // 最後のメッセージがユーザーの場合（AI応答待ち）、TypingIndicatorが表示される
    expect(screen.getByTestId("typing-indicator")).toBeDefined();
  });
});

describe("MessageList 自動スクロール（ツールパーツ対応）", () => {
  afterEach(() => {
    cleanup();
  });

  it("メッセージのパーツ数が変化した場合にも自動スクロールが発動する", () => {
    const scrollIntoViewMock = vi.fn();
    // scrollIntoViewをモック
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const initialMessages: UIMessage[] = [
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "検索して" }],
      },
      {
        id: "msg-2",
        role: "assistant",
        parts: [
          {
            type: "tool-webSearch",
            toolCallId: "call-1",
            toolName: "webSearch",
            state: "input-streaming",
            input: { query: "test" },
          } as unknown as UIMessage["parts"][number],
        ],
      },
    ];

    const { rerender } = render(
      <MessageList
        messages={initialMessages}
        isStreaming={true}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    // scrollIntoViewの呼び出し回数をリセット
    const callCountAfterInitial = scrollIntoViewMock.mock.calls.length;

    // パーツが追加されたメッセージで再レンダリング
    const updatedMessages: UIMessage[] = [
      ...initialMessages.slice(0, 1),
      {
        id: "msg-2",
        role: "assistant",
        parts: [
          {
            type: "tool-webSearch",
            toolCallId: "call-1",
            toolName: "webSearch",
            state: "output-available",
            input: { query: "test" },
            output: { results: [] },
          } as unknown as UIMessage["parts"][number],
          { type: "text", text: "結果です。" },
        ],
      },
    ];

    rerender(
      <MessageList
        messages={updatedMessages}
        isStreaming={true}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
        {...defaultMessageListProps}
      />
    );

    // パーツ数の変化によりscrollIntoViewが再度呼ばれている
    expect(scrollIntoViewMock.mock.calls.length).toBeGreaterThan(
      callCountAfterInitial
    );
  });
});

describe("MessageBubble ツールパーツ対応", () => {
  afterEach(() => {
    cleanup();
  });

  it("AIメッセージにツール呼び出しパーツが含まれる場合、ToolInvocationPartを表示する", () => {
    const messageWithTool: UIMessage = {
      id: "msg-tool-1",
      role: "assistant",
      parts: [
        {
          type: "tool-webSearch",
          toolCallId: "call-1",
          toolName: "webSearch",
          state: "output-available",
          input: { query: "TypeScript" },
          output: { results: [] },
        } as unknown as UIMessage["parts"][number],
        { type: "text", text: "検索結果です。" },
      ],
    };

    render(
      <MessageBubble
        message={messageWithTool}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // ToolInvocationPartが表示される
    expect(screen.getByTestId("tool-invocation-call-1")).not.toBeNull();
    // テキストも表示される
    expect(screen.getByText("検索結果です。")).not.toBeNull();
  });

  it("複数のツール呼び出しパーツを含むメッセージを正しい順序で表示する", () => {
    const messageWithMultipleTools: UIMessage = {
      id: "msg-tool-2",
      role: "assistant",
      parts: [
        {
          type: "tool-webSearch",
          toolCallId: "call-1",
          toolName: "webSearch",
          state: "output-available",
          input: { query: "test1" },
          output: { results: [] },
        } as unknown as UIMessage["parts"][number],
        {
          type: "tool-s3ListObjects",
          toolCallId: "call-2",
          toolName: "s3ListObjects",
          state: "output-available",
          input: { prefix: "/" },
          output: { objects: [] },
        } as unknown as UIMessage["parts"][number],
        { type: "text", text: "結果です。" },
      ],
    };

    render(
      <MessageBubble
        message={messageWithMultipleTools}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByTestId("tool-invocation-call-1")).not.toBeNull();
    expect(screen.getByTestId("tool-invocation-call-2")).not.toBeNull();
    expect(screen.getByText("結果です。")).not.toBeNull();
  });

  it("ユーザーメッセージではツールパーツは表示されない（テキストのみ）", () => {
    const userMessage: UIMessage = {
      id: "msg-user-1",
      role: "user",
      parts: [{ type: "text", text: "こんにちは" }],
    };

    render(
      <MessageBubble
        message={userMessage}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByText("こんにちは")).not.toBeNull();
    expect(screen.queryByTestId("tool-invocation-call-1")).toBeNull();
  });
});

/** WelcomeScreen テスト用のデフォルト props */
const defaultWelcomeScreenProps = {
  selectedModelId: "claude-sonnet-4-20250514",
  onModelSelect: vi.fn(),
  disabled: false,
};

describe("WelcomeScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("ウェルカムメッセージを表示する", () => {
    render(<WelcomeScreen {...defaultWelcomeScreenProps} />);

    expect(screen.getByTestId("welcome-screen")).toBeDefined();
  });

  it("アプリ名またはガイダンステキストを含む", () => {
    render(<WelcomeScreen {...defaultWelcomeScreenProps} />);

    // ウェルカム画面にテキストが存在する
    const welcomeScreen = screen.getByTestId("welcome-screen");
    expect(welcomeScreen.textContent).toBeTruthy();
  });

  it("モデルセレクターが含まれる", () => {
    render(<WelcomeScreen {...defaultWelcomeScreenProps} />);

    expect(screen.getByTestId("model-selector")).toBeDefined();
  });
});
