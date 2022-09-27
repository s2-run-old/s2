interface ListNode<T> {
  forEach: (cb: (x: T) => void) => void;
}

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
  cond: Expr;
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
  x: Expr;
};

type AssignStmt1 = {
  t: "assign";
  op: "=" | ":=";
  x: Expr;
  y: Expr;
};

type VarType =
  | string
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

type StringExpr = {
  t: "string";
  list: ListNode<Expr>;
};

type ArithOp = "+" | "-" | "*" | "/" | "%" | "&" | "|" | "^";
type CmpOp = "!=" | "<=" | ">=" | "==" | ">" | "<";
type LogicOp = "&&" | "||";
type CallOp = "()" | "{}";
type AstOp = ArithOp | CmpOp | LogicOp | CallOp;

class OpExpr1 {
  _v?: HTMLElement;
}

class ChainExpr1 {
  list?: DList<OpExpr1>;
}

type ChainExpr = {
  t: "chain";
  paren?: boolean;
  prefix?: string;
  list: ListNode<OpExpr>;

  _view?: HTMLElement;
};

type Expr = Ident1 | StringExpr | ChainExpr;

type Ident1 = {
  t: "ident";
  x: string;

  _view?: HTMLElement;
};

type OpExpr = {
  op: "" | "." | "()" | "{}" | ArithOp | "&&" | "||" | "!=";
  x: Expr;

  _opView?: HTMLElement;
};

function newIdent(x: string): Ident1 {
  return <Ident1>{ t: "ident", x: x };
}

function newChainExpr(list: OpExpr[]): ChainExpr {
  return <ChainExpr>{
    t: "chain",
    list: list,
  };
}

// static fromRaw0(n: any, up: any): any {
//   if (n instanceof Object) {
//     const no = n as DynObj;
//     no._up = up;
//     for (const k in no) {
//       no[k] = this.fromRaw(no[k]);
//     }
//     return no;
//   } else if (n instanceof Array) {
//     const l = new SList();
//     l.up = up;
//     n.forEach((v) => {
//       l.insertAfter(v);
//     });
//     return l;
//   } else {
//     return n;
//   }
// }
//
// static fromRaw(n: any): any {
//   return this.fromRaw0(n, undefined);
// }

function newExprStmt(x: Expr): ExprStmt1 {
  return <ExprStmt1>{ t: "expr", x: x };
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

class Editor {
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

  mount(): { div: HTMLElement; umount: () => void } {
    const setCursor = this.createCursor();

    const cleanup = this.listenSelectionChange(
      (elem: HTMLElement, left: number, offset: number) => {
        setCursor(elem.parentElement!, left);
        // this.db.handleSelect(elem.parentElement as Node, offset);
      }
    );

    const div = document.createElement("div");
    div.classList.add("editor");

    (async () => {
      // const mainBody = await this.fetcher.funcBody("main", "main");
      // const mainStructDecl = await this.fetcher.structDecl("main");
      // const mainFuncDecl = mainStructDecl.funcs.filter(
      //   (f) => f.name == "main"
      // )[0];

      const fakeArithExprs = (
        op: ArithOp,
        from: number,
        to: number
      ): ChainExpr => {
        const e = newChainExpr([{ op: "", x: newIdent(from.toString()) }]);
        for (let i = from + 1; i <= to; i++) {
          e.list.push({ op: op, x: newIdent(i.toString()) });
        }
        return e;
      };

      const e = fakeArithExprs("+", 1, 30);

      const e2 = fakeArithExprs("*", 1, 15);
      e2.paren = true;

      e.list[10] = { op: "-", x: e2 };

      const e3 = newChainExpr([
        { op: "", x: newIdent("items") },
        { op: ".", x: newIdent("map") },
        { op: "()", x: fakeArithExprs("-", 11, 15) },
      ]);
      e.list[12] = { op: "+", x: e3 };

      const lines = renderExprInit(e);
      div.appendChild(lines);
    })();

    return {
      div: div,
      umount: () => cleanup(),
    };
  }
}

// Init -> ExprStmt
// Init -> IfStmt
// ExprStmt -> AssignStmt

// ( -> ParenExpr
// [+-0-9] -> NumberLit
// " -> StringLit
// [a-zA-Z] -> Ident
// if|else -> Keyword
// . -> SelExpr

// type AstNode = { t: string };
//
// type AstInfo = {
//   htmlDom?: AstHtmlDom;
//   n?: AstNode;
// };
//
// interface AstHtmlDom extends HTMLElement {
//   astInfo: AstInfo;
// }
//
// class AstVDom {
//   n: AstNode;
//
//   static createElement(tag: string): AstHtmlDom {
//     const dom = document.createElement(tag);
//     const adom = dom as AstHtmlDom;
//     adom.astInfo = {};
//     return adom;
//   }
//
//   update() {}
// }
//
// class AstNodeGroup {
//   n: AstNode;
// }

// function renderExprInit(e: Expr): HTMLElement {
//   const lines = document.createElement("div");
//   lines.classList.add("lines");
//   document.body.appendChild(lines);
//
//   type DfsState = { e: Expr; childIdx: number; check: boolean };
//   const dfsStack: DfsState[] = [{ e: e, childIdx: 0, check: false }];
//
//   let lineWc = 0;
//   let line: HTMLElement;
//
//   const newLine = (start: Expr): HTMLElement => {
//     const line = document.createElement("div");
//     line.classList.add("line");
//     DOMData.set(line, { start });
//     lines.appendChild(line);
//     return line;
//   };
//
//   const checkLine = (start: Expr) => {
//     if (lineWc > 30) {
//       line = newLine(start);
//       lineWc = 0;
//     }
//   };
//
//   const lineAppend = (line: HTMLElement, a: HTMLElement, wc: number) => {
//     lineWc += wc;
//     line.appendChild(a);
//   };
//
//   const newText = (t: string): HTMLElement => {
//     const d = document.createElement("div");
//     d.classList.add("text");
//     d.innerText = t;
//     return d;
//   };
//
//   line = newLine(e);
//
//   for (;;) {
//     const state = dfsStack.pop();
//     if (state == undefined) {
//       break;
//     }
//     const e = state.e;
//
//     if (state.check) {
//       checkLine(e);
//     }
//
//     switch (e.t) {
//       case "chain": {
//         if (e.paren && state.childIdx == 0) {
//           const d = newText("(");
//           lineAppend(line, d, 1);
//         }
//
//         if (state.childIdx < e.list.length) {
//           const l = e.list[state.childIdx];
//
//           if (l.op) {
//             const d = newText(l.op);
//             switch (l.op) {
//               case ".": {
//                 lineAppend(line, d, l.op.length);
//                 break;
//               }
//
//               case "()": {
//                 lineAppend(line, newText("("), 1);
//                 lineAppend(line, newText(")"), 1);
//                 break;
//               }
//
//               default: {
//                 d.classList.add("sep");
//                 lineAppend(line, d, l.op.length + 2);
//                 break;
//               }
//             }
//           }
//
//           dfsStack.push({ e: e, childIdx: state.childIdx + 1, check: true });
//           dfsStack.push({
//             e: e.list[state.childIdx].x,
//             childIdx: 0,
//             check: false,
//           });
//         }
//
//         if (e.paren && state.childIdx == e.list.length) {
//           const d = newText(")");
//           lineAppend(line, d, 1);
//         }
//         break;
//       }
//
//       case "int-lit":
//       case "string-lit":
//       case "ident": {
//         const d = newText(e.x);
//         lineAppend(line, d, e.x.length);
//         break;
//       }
//     }
//   }
//
//   return lines;
// }

// class ExprView {
//   x: Expr;
//   v?: HTMLElement;
//
//   parent?: ExprView;
//   child?: ExprView[];
//
//   lineIdx = 0;
//   lineOff = 0;
//   lines: number[] = [];
//
//   layout() {
//     const tx = this.x;
//
//     switch (tx.t) {
//       case "string": {
//         break;
//       }
//
//       case "chain": {
//         let ci = 0;
//         const child = this.child!;
//
//         // first line
//         let w = 0;
//         while (ci < child.length) {
//           if (child[ci].lines.length == 1) {
//             w += child[ci].lines[0];
//           } else {
//             child[ci].lines[0];
//           }
//         }
//
//         break;
//       }
//
//       case "ident":
//       case "int-lit":
//       case "string-lit":
//       case "float-lit": {
//         this.wc = tx.x.length;
//         this.nl = 1;
//         break;
//       }
//     }
//   }
// }
//
// class StmtView {
//   constructor() {}
// }

// class DOMData {
//   static get(d: VNode): DOMDataV {
//     return (d as unknown as DOMDataI)[kDOMData];
//   }
//   static set(d: VNode, v: DOMDataV) {
//     (d as unknown as DOMDataI)[kDOMData] = v;
//   }
// }
//
// const kDOMData = Symbol("");
// type DOMDataV = AVNodeRef;
// type DOMDataI = {
//   [key: symbol]: DOMDataV;
// };

// class AstRender {
//   static div(typ: string, ref: string, text = ""): HTMLElement {
//     const div = document.createElement("div");
//     div.classList.add(typ);
//     div.setAttribute("type", typ);
//     div.setAttribute("ref", ref);
//     div.innerText = text;
//     return div;
//   }
//
//   static op(op: string, ref: string): HTMLElement {
//     return this.div("op", ref, op);
//   }
//
//   static expr(a: Expr1, ref: string): HTMLElement[] {
//     switch (a.t) {
//       case "bin": {
//         const d: HTMLElement[] = [];
//         a.list.forEach((a, idx) => {
//           if (idx > 0) {
//             d.push(this.op(a.op, ref + ".list." + idx + ".op"));
//           }
//           d.push(...this.expr(a.x, ref + ".list." + idx + ".x"));
//         });
//         return d;
//       }
//
//       case "string": {
//         const lquote = this.div("quote", ref + ".lquote", '"');
//         const rquote = this.div("quote", ref + ".rquote", '"');
//         const d: HTMLElement[] = [lquote];
//         a.list.forEach((a, idx) => {
//           d.push(...this.expr(a, ref + ".list." + idx));
//         });
//         d.push(rquote);
//         return d;
//       }
//
//       case "ident": {
//         return [this.div("ident", ref, a.x)];
//       }
//
//       case "sel": {
//         // a.c.c.d()().sss()(1+3+4)().a.a.a + 1*13*3*(a+b)
//         // width is not ok, should use text adjust width
//         return [];
//       }
//
//       case "call": {
//         const d = this.expr(a.x, ref + ".x");
//         const lbrace = this.div("brace", ref + ".lbrace", "(");
//         const rbrace = this.div("brace", ref + ".rbrace", ")");
//         d.push(lbrace);
//         a.list.forEach((x, idx) => {
//           d.push(...this.expr(x, ref + ".list."));
//           if (idx < a.list.length) {
//             const comma = this.div("comma", ref + ".comma", ",");
//             d.push(comma);
//           }
//         });
//         d.push(rbrace);
//         return d;
//       }
//
//       default:
//         return [this.div("unknown-expr", ref)];
//     }
//   }
//
//   static stmt(a: Stmt1, ref: string): HTMLElement {
//     switch (a.t) {
//       case "assign": {
//         const d = this.div("assign", ref);
//         return d;
//       }
//
//       case "expr": {
//         const d = this.div("expr", ref);
//         return d;
//       }
//
//       case "block": {
//         const d = this.div("block", ref);
//         a.stmts.forEach((a, idx) =>
//           document.appendChild(this.stmt(a, ".stmts." + idx))
//         );
//         return d;
//       }
//
//       default:
//         return this.div("unknown-stmt", ref);
//     }
//   }
// }

// type DBSelectCb = (offset?: number) => void;
//
// class DBNode {
//   constructor(
//     public b: DomBuilder,
//     public elem?: Node,
//     public childNodes: DBNode[] = [],
//     public selectCb?: DBSelectCb
//   ) {}
//
//   private elem0(): HTMLElement {
//     if (!this.elem) {
//       this.elem = document.createElement("div");
//     }
//     return this.elem as HTMLElement;
//   }
//
//   private render0(parent: Node) {
//     this.elem && parent.appendChild(this.elem);
//     this.childNodes.forEach((c) => c.render0(this.elem || parent));
//     if (this.selectCb) {
//       (this.elem as unknown as DOMDataI)[kDOMData] = {
//         selectCb: this.selectCb,
//       };
//     }
//   }
//
//   render(): Node {
//     const div = this.elem0();
//     this.childNodes.forEach((c) => {
//       c && c.render0(div);
//     });
//
//     return div;
//   }
//
//   child(...v: DBNode[]): DBNode {
//     this.childNodes = v;
//     return this;
//   }
//
//   cls(...cls: string[]): DBNode {
//     this.elem0().classList.add(...cls);
//     return this;
//   }
//
//   word(): DBNode {
//     return this.cls("word");
//   }
//
//   italic(): DBNode {
//     return this.cls("italic");
//   }
//
//   select(cb: DBSelectCb): DBNode {
//     this.selectCb = cb;
//     return this;
//   }
// }
//
// class DomBuilder {
//   handleSelect(elem: Node, offset: number) {
//     (elem as unknown as DOMDataI)[kDOMData]?.selectCb?.(offset);
//   }
//
//   list(v: DBNode[]): DBNode {
//     return new DBNode(this, undefined, v);
//   }
//
//   div(c: string, ...v: DBNode[]): DBNode {
//     return new DBNode(this, document.createElement("div")).child(...v).cls(c);
//   }
//
//   indent(...v: DBNode[]): DBNode {
//     return this.div("indent", ...v);
//   }
//
//   text(s: string): DBNode {
//     const div = this.div("text");
//     (div.elem as HTMLElement).innerHTML = s;
//     return div;
//   }
//
//   keyword(s: string): DBNode {
//     return this.text(s).cls("keyword");
//   }
//
//   punc(s: string): DBNode {
//     return this.text(s).cls("punc");
//   }
//
//   type(s: string): DBNode {
//     return this.text(s).cls("type");
//   }
//
//   string(s: string): DBNode {
//     return this.text(s).cls("string");
//   }
//
//   comment(s: string): DBNode {
//     return this.text(s).cls("comment");
//   }
//
//   ident(s: string): DBNode {
//     return this.text(s).cls("ident");
//   }
//
//   line(...v: DBNode[]): DBNode {
//     return this.div("line", ...v);
//   }
// }

// db = new DomBuilder();

// renderOtherDecl(d: Decl): DBNode {
//   const b = this.db;
//   if (d instanceof StructDecl) {
//     return this.renderStructDecl(d);
//   } else if (d instanceof FuncDecl) {
//     return this.renderFuncDecl(d);
//   } else {
//     return b.text(`invalid Decl`);
//   }
// }
//
// splitDeclGroups(ds: Decl[]): Decl[][] {
//   let group: Decl[] = [];
//   const groups: Decl[][] = [];
//   ds.forEach((d, i) => {
//     if (i == 0 || (ds[i - 1] instanceof VarDecl && d instanceof VarDecl)) {
//       group.push(d);
//     } else {
//       groups.push(group);
//       group = [d];
//     }
//   });
//   if (group.length > 0) {
//     groups.push(group);
//   }
//   return groups;
// }
//
// renderVarDeclGroup(ds: VarDecl[]): DBNode {
//   const b = this.db;
//   return b.div(
//     "var-decls",
//     ...ds.map((d) => {
//       return b.list([
//         b.keyword("var"),
//         b.ident(d.name),
//         b.div("var-type", this.renderVarType(d.type)),
//       ]);
//     })
//   );
// }
//
// renderDecls(ds: Decl[], pad: boolean = false): DBNode {
//   const b = this.db;
//
//   const group = (ds: Decl[]): DBNode => {
//     if (ds[0] instanceof VarDecl) {
//       return this.renderVarDeclGroup(ds as VarDecl[]);
//     } else {
//       return b.list(ds.map((d) => this.renderOtherDecl(d)));
//     }
//   };
//
//   const space = (): DBNode => {
//     return b.line(b.text("&nbsp;").cls("space"));
//   };
//
//   let a = this.splitDeclGroups(ds).map((ds, i, all) => {
//     const r = [group(ds)];
//     if (i < all.length - 1) {
//       r.push(space());
//     }
//     return b.list(r);
//   });
//
//   if (pad) {
//     a = a.slice();
//     a.unshift(space());
//     a.unshift(space());
//     a.push(space());
//     a.push(space());
//   }
//
//   return b.list(a);
// }
//
// renderVarType(t: Type): DBNode {
//   const b = this.db;
//   if (t instanceof ArrayType) {
//     return b.list([b.punc("[]"), this.renderVarType(t.x)]);
//   } else if (t instanceof Ident) {
//     return b.type(t.v);
//   } else if (t instanceof StructDecl) {
//     return b.type(t.name);
//   } else {
//     return b.text("invalid Type");
//   }
// }
//
// renderStructDecl(d: StructDecl): DBNode {
//   const b = this.db;
//   return b.div(
//     "struct-decl",
//     b.line(
//       b.keyword("struct").select(() => {
//         console.log("select", d);
//       }),
//       b.ident(d.name).word(),
//       b.punc("{").word()
//     ),
//     b.indent(this.renderDecls(d.decls)),
//     b.line(b.punc("}"))
//   );
// }
//
// renderExpr(e: Expr): DBNode {
//   const b = this.db;
//   if (e instanceof StringLit) {
//     return b.list([b.punc('"'), b.string(e.v), b.punc('"')]);
//   } else if (e instanceof Ident) {
//     return b.text("Ident");
//   } else if (e instanceof BinExpr) {
//     return b.text("BinExpr");
//   } else {
//     return b.text("invalid Expr");
//   }
// }
//
// renderAssignStmt(_: AssignStmt): DBNode {
//   const b = this.db;
//   return b.text("AssignStmt");
// }
//
// renderStmt(stmt: Stmt): DBNode {
//   const b = this.db;
//   if (stmt instanceof ExprStmt) {
//     return b.line(this.renderExpr(stmt.e));
//   } else if (stmt instanceof BlockStmt) {
//     return this.renderStmts(stmt.stmts);
//   } else if (stmt instanceof AssignStmt) {
//     return this.renderAssignStmt(stmt);
//   } else {
//     return b.text("invalid Stmt");
//   }
// }
//
// renderStmts(stmts: Stmt[]): DBNode {
//   const b = this.db;
//   return b.list(stmts.map((s) => this.renderStmt(s)));
// }
//
// renderFuncDecl(d: FuncDecl): DBNode {
//   const b = this.db;
//   return b.div(
//     "func-decl",
//     b.line(
//       b.keyword(d.type),
//       b.ident(d.name).word(),
//       b.punc("("),
//       b.punc(")"),
//       b.punc("{").word()
//     ),
//     b.indent(this.renderStmts(d.body.stmts)),
//     b.line(b.punc("}"))
//   );
// }

// stmt( word("func") ident("abc") brace("()" ident("1") punc("*") ident("22") )  )
// stmt( ident("abc") brace( ident("1") punc("*") ident("2") punc("-") ident("33") ) )

// renderAstGroup(g: AstGroup): DBNode {
//   // struct {
//   //   a int
//   // }
//   const b = this.db;
// }
//
// renderFuncBody(d: FuncDecl1, body: FuncBody): DBNode {
//   const b = this.db;
//   return b.div(
//     "func-decl",
//     b.line(
//       b.keyword(d.kind),
//       b.ident(d.name).word(),
//       b.punc("("),
//
//       b.punc(")"),
//       b.punc("{").word()
//     ),
//     b.indent(this.renderAstGroup(body.g)),
//     b.line(b.punc("}"))
//   );
// }

// type FuncRef = string;
//
// type AstNode = { t: string };
//
// type ScrollListQuery<T> = () => T;
//
// type AstNodeRef = { path: string[] };
//
// type SelectItem = { title: string };
//
// type EditorState = {
//   view?: {
//     scroll?: ScrollListQuery<FuncRef>;
//     func?: FuncRef;
//     node?: AstNodeRef;
//   };
//   errors?: { node: AstNodeRef; err: string }[];
//   rangeSelect?: { startNode: AstNodeRef; endNode: AstNodeRef };
//   dropSelect?: { node: AstNodeRef; query: ScrollListQuery<SelectItem> };
//   input?: { node: AstNodeRef };
//   nodeChange: { node: AstNodeRef };
// };

// class Editor1 {
//   nodeCache: Map<FuncRef, AstNode> = new Map();
//   state: EditorState = {};
//
//   constructor() {
//     this.nodeCache.set("main", { t: "123" });
//   }
//
//   setState(s: EditorState) {
//     if (s.view) {
//     }
//
//     if (s.errors) {
//     }
//
//     if (s.rangeSelect) {
//     }
//
//     if (s.dropSelect) {
//     }
//
//     if (s.input) {
//     }
//   }
// }

// class AstFetcher {
//   allSchema = <{ [key: string]: StructDecl1 }>{
//     main: <StructDecl1>{
//       vars: [
//         <VarDecl1>{
//           name: "items",
//           ty: { t: "array", x: "Item" },
//         },
//       ],
//       funcs: [
//         <FuncDecl1>{
//           name: "main",
//           kind: "widget",
//         },
//       ],
//     },
//     Item: <StructDecl1>{
//       vars: [
//         <VarDecl1>{
//           name: "title",
//           ty: "string",
//         },
//         <VarDecl1>{
//           name: "content",
//           ty: "string",
//         },
//       ],
//     },
//   };
//
//   allBodies = <{ [key: string]: BlockStmt1 }>{
//     "main.main": <BlockStmt1>{
//       t: "block",
//       stmts: [
//         newExprStmt(
//           newChainExpr([
//             { op: "", x: newIdent("items") },
//             { op: ".", x: newIdent("map") },
//             { op: "{}", x: newIdent("i") },
//           ])
//         ),
//       ],
//     },
//   };
//
//   async structDecl(struct: string): Promise<StructDecl1> {
//     const decl = this.allSchema[struct];
//     if (!decl) {
//       return Promise.reject(new Error("no such decl"));
//     }
//     return decl;
//   }
//
//   async funcBody(struct: string, method: string): Promise<BlockStmt1> {
//     const block = this.allBodies[struct + "." + method];
//     if (!block) {
//       return Promise.reject(new Error("no such func"));
//     }
//     return block;
//   }
// }