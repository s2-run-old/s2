// The Last Judgment

// Init -> ExprStmt
// Init -> IfStmt
// ExprStmt -> AssignStmt

// ( -> ParenExpr
// [+-0-9] -> NumberLit
// " -> StringLit
// [a-zA-Z] -> Ident
// if|else -> Keyword
// . -> SelExpr

type StructDecl1 = {
  name: string;
  funcs: FuncDecl1[];
  vars: VarDecl1[];
};

type FuncDecl1 = {
  name: string;
  kind: "func" | "widget";
  params: VarDecl1[];
  rets: VarDecl1[];
};

type VarDecl1 = {
  name: string;
  ty: VarType;
};

type Stmt1 = AssignStmt1 | ExprStmt1 | IfStmt1 | BlockStmt1;

type IfBody = {
  kind: "else-if" | "else";
  cond: Expr1;
  body: BlockStmt1;
};

type IfStmt1 = {
  t: "if";
  bodies: IfBody[];
};

type BlockStmt1 = {
  t: "block";
  stmts: Stmt1[];
};

type ExprStmt1 = {
  t: "expr";
  x: Expr1;
};

type AssignStmt1 = {
  t: "assign";
  op: "=" | ":=";
  x: Expr1;
  y: Expr1;
};

type VarType =
  | string
  | {
      t: "struct";
      x: VarType;
    }
  | {
      t: "array";
      x: VarType;
    }
  | {
      t: "ptr";
      x: VarType;
    }
  | {
      t: "func";
      params: VarType[];
      rets: VarType[];
    };

type Expr1 =
  | StringExpr
  | StringLit1
  | IntLit1
  | FloatLit1
  | UnaryExpr1
  | BinExpr1
  | CallExpr1
  | Ident1
  | SelExpr1;

type Ident1 = {
  t: "ident";
  x: string;
  ty: VarType;
};

type SelExpr1 = {
  t: "sel";
  x: Expr1;
  sel: Ident1[];
};

type BinOp1 =
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

type BinExpr1 = {
  t: "bin";
  ty: VarType;
  op: BinOp1;
  x: Expr1;
  y: Expr1;
};

type UnaryOp1 = "+" | "-" | "&" | "*";

type UnaryExpr1 = {
  t: "unary";
  ty: VarType;
  op: UnaryOp1;
  x: Expr1;
};

type CallExpr1 = {
  t: "call";
  ty: VarType;
  x: Expr1;
  y: Expr1[] | BlockStmt1;
};

type StringExpr = {
  t: "string";
  ty: VarType;
  list: Expr1[];
};

type StringLit1 = {
  t: "string-lit";
  ty: VarType;
  x: string;
};

type IntLit1 = {
  t: "int-lit";
  ty: VarType;
  x: string;
};

type FloatLit1 = {
  t: "float-lit";
  ty: VarType;
  x: string;
};

type StructAddField = {
  t: "op-add-field";
  x: VarDecl1;
};

type AstOp = StructAddField;

class AstCacheNode {}

class AstCache {
  oplog: AstOp[];
}

class AstFetcher {
  constructor() {}

  async allStructs(): Promise<StructDecl1[]> {
    return Promise.resolve([
      <StructDecl1>{
        name: "main",
        vars: [
          <VarDecl1>{
            name: "items",
            ty: { t: "array", x: "Item" },
          },
        ],
        funcs: [
          <FuncDecl1>{
            name: "main",
            kind: "widget",
          },
        ],
      },

      <StructDecl1>{
        name: "Item",
        vars: [
          <VarDecl1>{
            name: "title",
            ty: "string",
          },
          <VarDecl1>{
            name: "content",
            ty: "string",
          },
        ],
      },
    ]);
  }

  bodies: { [key: string]: BlockStmt1 } = {
    "main.main": <BlockStmt1>{
      t: "block",
      stmts: [
        <ExprStmt1>{
          t: "expr",
          x: <CallExpr1>{
            t: "call",
            x: <SelExpr1>{
              t: "sel",
              x: <Ident1>{
                t: "ident",
                x: "items",
                ty: { t: "struct", x: "Item" },
              },
              sel: [<Ident1>{ t: "ident", x: "map" }],
            },
          },
        },
      ],
    },
  };

  async funcBody(struct: string, method: string): Promise<BlockStmt1> {
    const body = this.bodies[struct + "." + method];
    if (!body) {
      return Promise.reject(new Error("no such func"));
    }
    return body;
  }
}

const kNodeData = Symbol("");
type NodeDataV = {
  selectCb?: DBSelectCb;
};
type NodeDataI = {
  [key: symbol]: NodeDataV;
};

type DBSelectCb = (offset?: number) => void;

class DBNode {
  constructor(
    public b: DomBuilder,
    public elem?: Node,
    public childNodes: DBNode[] = [],
    public selectCb?: DBSelectCb
  ) {}

  private elem0(): HTMLElement {
    if (!this.elem) {
      this.elem = document.createElement("div");
    }
    return this.elem as HTMLElement;
  }

  private render0(parent: Node) {
    this.elem && parent.appendChild(this.elem);
    this.childNodes.forEach((c) => c.render0(this.elem || parent));
    if (this.selectCb) {
      (this.elem as unknown as NodeDataI)[kNodeData] = {
        selectCb: this.selectCb,
      };
    }
  }

  render(): Node {
    const div = this.elem0();
    this.childNodes.forEach((c) => {
      c && c.render0(div);
    });

    return div;
  }

  child(...v: DBNode[]): DBNode {
    this.childNodes = v;
    return this;
  }

  cls(...cls: string[]): DBNode {
    this.elem0().classList.add(...cls);
    return this;
  }

  word(): DBNode {
    return this.cls("word");
  }

  italic(): DBNode {
    return this.cls("italic");
  }

  select(cb: DBSelectCb): DBNode {
    this.selectCb = cb;
    return this;
  }
}

class DomBuilder {
  handleSelect(elem: Node, offset: number) {
    (elem as unknown as NodeDataI)[kNodeData]?.selectCb?.(offset);
  }

  list(v: DBNode[]): DBNode {
    return new DBNode(this, undefined, v);
  }

  div(c: string, ...v: DBNode[]): DBNode {
    return new DBNode(this, document.createElement("div")).child(...v).cls(c);
  }

  indent(...v: DBNode[]): DBNode {
    return this.div("indent", ...v);
  }

  text(s: string): DBNode {
    const div = this.div("text");
    (div.elem as HTMLElement).innerHTML = s;
    return div;
  }

  keyword(s: string): DBNode {
    return this.text(s).cls("keyword");
  }

  punc(s: string): DBNode {
    return this.text(s).cls("punc");
  }

  type(s: string): DBNode {
    return this.text(s).cls("type");
  }

  string(s: string): DBNode {
    return this.text(s).cls("string");
  }

  comment(s: string): DBNode {
    return this.text(s).cls("comment");
  }

  ident(s: string): DBNode {
    return this.text(s).cls("ident");
  }

  line(...v: DBNode[]): DBNode {
    return this.div("line", ...v);
  }
}

class Editor {
  fetcher: AstFetcher;

  db = new DomBuilder();

  renderOtherDecl(d: Decl): DBNode {
    const b = this.db;
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

  renderVarDeclGroup(ds: VarDecl[]): DBNode {
    const b = this.db;
    return b.div(
      "var-decls",
      ...ds.map((d) => {
        return b.list([
          b.keyword("var"),
          b.ident(d.name),
          b.div("var-type", this.renderVarType(d.type)),
        ]);
      })
    );
  }

  renderDecls(ds: Decl[], pad: boolean = false): DBNode {
    const b = this.db;

    const group = (ds: Decl[]): DBNode => {
      if (ds[0] instanceof VarDecl) {
        return this.renderVarDeclGroup(ds as VarDecl[]);
      } else {
        return b.list(ds.map((d) => this.renderOtherDecl(d)));
      }
    };

    const space = (): DBNode => {
      return b.line(b.text("&nbsp;").cls("space"));
    };

    let a = this.splitDeclGroups(ds).map((ds, i, all) => {
      const r = [group(ds)];
      if (i < all.length - 1) {
        r.push(space());
      }
      return b.list(r);
    });

    if (pad) {
      a = a.slice();
      a.unshift(space());
      a.unshift(space());
      a.push(space());
      a.push(space());
    }

    return b.list(a);
  }

  renderVarType(t: Type): DBNode {
    const b = this.db;
    if (t instanceof ArrayType) {
      return b.list([b.punc("[]"), this.renderVarType(t.x)]);
    } else if (t instanceof Ident) {
      return b.type(t.v);
    } else if (t instanceof StructDecl) {
      return b.type(t.name);
    } else {
      return b.text("invalid Type");
    }
  }

  renderStructDecl(d: StructDecl): DBNode {
    const b = this.db;
    return b.div(
      "struct-decl",
      b.line(
        b.keyword("struct").select(() => {
          console.log("select", d);
        }),
        b.ident(d.name).word(),
        b.punc("{").word()
      ),
      b.indent(this.renderDecls(d.decls)),
      b.line(b.punc("}"))
    );
  }

  renderExpr(e: Expr): DBNode {
    const b = this.db;
    if (e instanceof StringLit) {
      return b.list([b.punc('"'), b.string(e.v), b.punc('"')]);
    } else if (e instanceof Ident) {
      return b.text("Ident");
    } else if (e instanceof BinExpr) {
      return b.text("BinExpr");
    } else {
      return b.text("invalid Expr");
    }
  }

  renderAssignStmt(_: AssignStmt): DBNode {
    const b = this.db;
    return b.text("AssignStmt");
  }

  renderStmt(stmt: Stmt): DBNode {
    const b = this.db;
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

  renderStmts(stmts: Stmt[]): DBNode {
    const b = this.db;
    return b.list(stmts.map((s) => this.renderStmt(s)));
  }

  renderFuncDecl(d: FuncDecl): DBNode {
    const b = this.db;
    return b.div(
      "func-decl",
      b.line(
        b.keyword(d.type),
        b.ident(d.name).word(),
        b.punc("("),
        b.punc(")"),
        b.punc("{").word()
      ),
      b.indent(this.renderStmts(d.body.stmts)),
      b.line(b.punc("}"))
    );
  }

  listenSelectionChange(
    cb: (selElem: HTMLElement, left: number, offset: number) => void
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
      let offset: number;
      let selElem: HTMLElement;

      if (sel.focusNode == range0.endContainer) {
        selElem = range0.endContainer as HTMLElement;
        left =
          rects[rects.length - 1].right -
          selElem.parentElement!.getBoundingClientRect().left;
        offset = range0.endOffset;
      } else {
        selElem = range0.startContainer as HTMLElement;
        left =
          rects[0].left - selElem.parentElement!.getBoundingClientRect().left;
        offset = range0.startOffset;
      }

      const parentElem = selElem.parentElement!;

      if (parentElem.classList.contains("space") && offset != 0) {
        const r = document.createRange();
        r.setStart(selElem, 0);
        r.setEnd(selElem, 0);
        const s = window.getSelection()!;
        s.removeAllRanges();
        s.addRange(r);
        return;
      }

      cb(selElem, left, offset);
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
      (elem: HTMLElement, left: number, offset: number) => {
        setCursor(elem.parentElement!, left);
        this.db.handleSelect(elem.parentElement as Node, offset);
      }
    );

    const b = this.db;
    const dom = b.div("editor").render();

    (async () => {
      (await this.fetcher.allStructs()).forEach((s) => {});
    })();

    return {
      dom: dom,
      umount: () => cleanup(),
    };
  }

  constructor(fetcher: AstFetcher) {
    this.fetcher = fetcher;
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

const editor = new Editor(main);
document.querySelector<HTMLDivElement>("#app")!.appendChild(editor.mount().dom);
