// Init -> ExprStmt
// Init -> IfStmt
// ExprStmt -> AssignStmt

// ( -> ParenExpr
// [+-0-9] -> NumberLit
// " -> StringLit
// [a-zA-Z] -> Ident
// if|else -> Keyword
// . -> SelExpr

type Decl = FuncDecl | StructDecl | VarDecl;

class StructChangeName {
  before!: string;
  after!: string;
}

class StructFieldChangeName {
  before!: string;
  after!: string;
}

class StructFieldChangeType {
  before!: Type;
  after!: Type;
}

class StructAddField {
  field!: Type;
}

class StructRemoveField {
  field!: string;
}

class StructDecl {
  name!: string;
  decls!: Decl[];
  constructor(init?: Partial<StructDecl>) {
    Object.assign(this, init);
  }
}

type FuncType = "widget" | "func";

class FuncDecl {
  type!: FuncType;
  name!: string;
  body!: BlockStmt;
  constructor(init?: Partial<FuncDecl>) {
    Object.assign(this, init);
  }
}

class VarDecl {
  constructor(public name: string, public type: Type) {}
}

type Type = ArrayType | Ident;

class ArrayType {
  constructor(public x: Type) {}
}

class StringLit {
  constructor(public v: string) {}
}

class Ident {
  constructor(public v: string) {}
}

type Expr = BinExpr | StringLit | Ident;

type BinOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | ">"
  | "<"
  | "<="
  | ">="
  | "=="
  | "!="
  | "&&"
  | "||";

class BinExpr {
  constructor(public l: Expr, public op: BinOp, public r: Expr) {}
}

class AssignStmt {
  constructor(public l: Expr, public r: Expr) {}
}

class ExprStmt {
  constructor(public e: Expr) {}
}

type Stmt = BlockStmt | AssignStmt | ExprStmt;

class BlockStmt {
  constructor(public stmts: Stmt[]) {}
}

const kData = Symbol("");

type DomData = {};

type DomSymbolIndex = {
  [key: symbol]: DomData;
};

class DomBuilder {
  constructor(private elem?: Node, private childv: DomBuilder[] = []) {}

  private elem0(): HTMLElement {
    if (!this.elem) {
      this.elem = document.createElement("div");
    }
    return this.elem as HTMLElement;
  }

  private render0(parent: Node) {
    this.elem && parent.appendChild(this.elem);
    this.childv.forEach((c) => c.render0(this.elem || parent));
  }

  render(): Node {
    const div = this.elem0();
    this.childv.forEach((c) => {
      c.render0(div);
    });
    return div;
  }

  data(v: DomData): DomBuilder {
    (this.elem0() as unknown as DomSymbolIndex)[kData] = v;
    return this;
  }

  child(...v: DomBuilder[]): DomBuilder {
    this.childv = v;
    return this;
  }

  cls(...cls: string[]): DomBuilder {
    this.elem0().classList.add(...cls);
    return this;
  }

  word(): DomBuilder {
    return this.cls("word");
  }

  flexCol(): DomBuilder {
    return this.cls("flex-col");
  }

  static list(v: DomBuilder[]): DomBuilder {
    return new DomBuilder(undefined, v);
  }

  static div(c: string, ...v: DomBuilder[]): DomBuilder {
    return new DomBuilder(document.createElement("div")).child(...v).cls(c);
  }

  static indent(...v: DomBuilder[]): DomBuilder {
    return this.div("indent", ...v);
  }

  static text(s: string): DomBuilder {
    const div = this.div("text");
    (div.elem as HTMLElement).innerText = s;
    return div;
  }

  static word(...v: DomBuilder[]): DomBuilder {
    return this.div("word", ...v);
  }

  static textw(s: string): DomBuilder {
    return this.text(s).word();
  }

  static line(...v: DomBuilder[]): DomBuilder {
    return this.div("line", ...v).flexCol();
  }

  static group(...v: DomBuilder[]): DomBuilder {
    return this.div("group", ...v);
  }
}

class Editor {
  main: StructDecl;

  renderDecl(d: Decl): DomBuilder {
    const b = DomBuilder;
    if (d instanceof StructDecl) {
      return this.renderStructDecl(d);
    } else if (d instanceof FuncDecl) {
      return this.renderFuncDecl(d);
    } else {
      return b.text(`invalid Decl`);
    }
  }

  splitDeclGroups(ds: Decl[]): Decl[][] {
    let group: Decl[] = [];
    const groups: Decl[][] = [];
    ds.forEach((d, i) => {
      if (i == 0 || (ds[i - 1] instanceof VarDecl && d instanceof VarDecl)) {
        group.push(d);
      } else {
        groups.push(group);
        group = [d];
      }
    });
    if (group.length > 0) {
      groups.push(group);
    }
    return groups;
  }

  renderVarDeclGroup(ds: VarDecl[]): DomBuilder {
    const b = DomBuilder;

    const cvar = b.div(
      "var",
      ...ds.map((_) => {
        return b.text("var");
      })
    );
    const cname = b.div(
      "name",
      ...ds.map((d) => {
        return b.text(d.name);
      })
    );
    const ctype = b.div(
      "type",
      ...ds.map((d) => {
        return b.line(this.renderVarType(d.type));
      })
    );

    return b.group(cvar, cname.word(), ctype.word()).flexCol();
  }

  renderDecls(ds: Decl[]): DomBuilder {
    const b = DomBuilder;
    return b.list(
      this.splitDeclGroups(ds).map((ds) => {
        if (ds[0] instanceof VarDecl) {
          return this.renderVarDeclGroup(ds as VarDecl[]);
        } else {
          return b.group(...ds.map((d) => this.renderDecl(d)));
        }
      })
    );
  }

  renderVarType(t: Type): DomBuilder {
    const b = DomBuilder;
    if (t instanceof ArrayType) {
      return b.list([b.text("[]"), this.renderVarType(t.x)]);
    } else if (t instanceof Ident) {
      return b.text(t.v);
    } else {
      return b.text("invalid Type");
    }
  }

  renderStructFields(ds: Decl[]): DomBuilder {
    return DomBuilder.div("struct-fields", this.renderDecls(ds));
  }

  renderStructDecl(d: StructDecl): DomBuilder {
    const b = DomBuilder;
    return b.div(
      "struct-decl",
      b.line(b.text("struct"), b.textw(d.name), b.textw("{")),
      b.indent(this.renderStructFields(d.decls)),
      b.line(b.text("}"))
    );
  }

  renderExpr(e: Expr): DomBuilder {
    const b = DomBuilder;
    if (e instanceof StringLit) {
      return b.list([b.text('"'), b.text(e.v), b.text('"')]);
    } else if (e instanceof Ident) {
      return b.text("Ident");
    } else if (e instanceof BinExpr) {
      return b.text("BinExpr");
    } else {
      return b.text("invalid Expr");
    }
  }

  renderAssignStmt(_: AssignStmt): DomBuilder {
    const b = DomBuilder;
    return b.text("AssignStmt");
  }

  renderStmt(stmt: Stmt): DomBuilder {
    const b = DomBuilder;
    if (stmt instanceof ExprStmt) {
      return b.line(this.renderExpr(stmt.e));
    } else if (stmt instanceof BlockStmt) {
      return this.renderStmts(stmt.stmts);
    } else if (stmt instanceof AssignStmt) {
      return this.renderAssignStmt(stmt);
    } else {
      return b.text("invalid Stmt");
    }
  }

  renderStmts(stmts: Stmt[]): DomBuilder {
    return DomBuilder.list(stmts.map((s) => this.renderStmt(s)));
  }

  renderFuncDecl(d: FuncDecl): DomBuilder {
    const b = DomBuilder;
    return b.div(
      "func-decl",
      b.line(
        b.text(d.type),
        b.textw(d.name),
        b.text("("),
        b.text(")"),
        b.textw("{")
      ),
      b.indent(this.renderStmts(d.body.stmts)),
      b.line(b.text("}"))
    );
  }

  listenSelectionChange(
    cb: (selElem: HTMLElement, left: number, idx: number) => void
  ): () => void {
    const handler = () => {
      const sel = document.getSelection()!;
      if (sel.rangeCount == 0) {
        return;
      }

      const range0 = sel.getRangeAt(0);
      const rects = range0.getClientRects();
      if (rects.length == 0) {
        return;
      }

      if (sel.focusNode!.nodeType != Node.TEXT_NODE) {
        return;
      }

      let left: number;
      let idx: number;
      let selElem: HTMLElement;

      if (sel.focusNode == range0.endContainer) {
        selElem = range0.endContainer as HTMLElement;
        left =
          rects[rects.length - 1].right -
          selElem.parentElement!.getBoundingClientRect().left;
        idx = range0.endOffset;
      } else {
        selElem = range0.startContainer as HTMLElement;
        left =
          rects[0].left - selElem.parentElement!.getBoundingClientRect().left;
        idx = range0.startOffset;
      }

      cb(selElem, left, idx);
    };

    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }

  createCursor(): (elem: HTMLElement, left: number) => void {
    const clsAnimation = "cursor-animation";
    const cursor = document.createElement("div");
    cursor.classList.add("cursor", clsAnimation);
    return (elem: HTMLElement, left: number) => {
      cursor.classList.remove(clsAnimation);
      cursor.classList.add(clsAnimation);
      elem.appendChild(cursor);
      cursor.style.left = left + "px";
    };
  }

  createInput(): HTMLInputElement {
    const input = document.createElement("input");
    input.classList.add("text", "input");

    let inComposition = false;
    input.addEventListener("compositionstart", () => {
      inComposition = true;
    });
    input.addEventListener("compositionend", () => {
      inComposition = false;
    });

    input.addEventListener("keyup", () => {
      if (inComposition) {
        input.value;
      } else {
        input.value = "";
      }
    });

    return input;
  }

  mount(): { dom: Node; umount: () => void } {
    const setCursor = this.createCursor();

    const cleanup = this.listenSelectionChange(
      (elem: HTMLElement, left: number, _: number) => {
        setCursor(elem.parentElement!, left);
      }
    );

    const dom = DomBuilder.div(
      "editor",
      this.renderStructFields(this.main.decls)
    ).render();

    return {
      dom: dom,
      umount: () => cleanup(),
    };
  }

  constructor(main: StructDecl) {
    this.main = main;

    // setTimeout(() => {
    //   const r = document.createRange();
    //   r.setStart(textInner, 1);
    //   r.setEnd(textInner, 2);
    //   const s = window.getSelection()!;
    //   s.removeAllRanges();
    //   s.addRange(r);
    // }, 500);
  }
}

class EditorCss {
  findRule(sel: string): CSSStyleRule | null {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      for (let j = 0; j < sheet.cssRules.length; j++) {
        const rule = sheet.cssRules[j];
        if (rule instanceof CSSStyleRule) {
          if (rule.selectorText == sel) {
            return rule;
          }
        }
      }
    }
    return null;
  }

  text = this.findRule(".editor .text")!;
  indent = this.findRule(".editor .indent")!;
}

const main = new StructDecl({
  name: "",
  decls: [
    new StructDecl({
      name: "Item",
      decls: [
        new VarDecl("content", new Ident("string")),
        new VarDecl("done", new Ident("bool")),
      ],
    }),
    new VarDecl("items", new ArrayType(new Ident("Item"))),
    new FuncDecl({
      type: "widget",
      name: "main",
      body: new BlockStmt([new ExprStmt(new StringLit("hello world"))]),
    }),
  ],
});

const editor = new Editor(main);
document.querySelector<HTMLDivElement>("#app")!.appendChild(editor.mount().dom);
