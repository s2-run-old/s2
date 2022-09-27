interface DynObj {
  [key: string]: any;
}

class UpRef {
  constructor(public up: any, public field: string) {}
}

class DList<T> {
  prev: DList<T>;
  next: DList<T>;
  v?: T;
  up?: any;

  constructor() {
    this.prev = this;
    this.next = this;
  }

  empty(): boolean {
    return this.prev == this;
  }

  static new<T>(v: T): DList<T> {
    const n = new DList<T>();
    n.v = v;
    return n;
  }

  static newList<T>(init: T[]) {
    const list = new DList<T>();
    init.forEach((v) => list.appendV(v));
    return list;
  }

  remove(n: DList<T>) {
    n.prev.next = n.next;
    n.next.prev = n.prev;
    n.next = n;
    n.prev = n;
  }

  appendV(v: T) {
    this.append(DList.new<T>(v));
  }

  insertAfterV(after: DList<T>, v: T) {
    this.insertAfter(after, DList.new<T>(v));
  }

  append(n: DList<T>) {
    this.insertAfter(this.prev, n);
  }

  insertAfter(after: DList<T>, insert: DList<T>) {
    (insert.v as unknown as UpRef).up = insert;
    insert.up = this;
    insert.prev = after;
    insert.next = after.next;
    after.next.prev = insert;
    after.next = insert;
    return insert;
  }

  forEach(cb: (x: DList<T>, i: number) => void) {
    let i = 0;
    for (let p = this.next; p != this; p = p.next) {
      cb(p, i);
      i++;
    }
  }

  forEachV(cb: (x: T, i: number) => void) {
    this.forEach((x, i) => cb(x.v!, i));
  }
}

type ExprType = StructType | StringType | IntType | InvalidType;

class StructType {
  constructor(public fields: ExprType[] = []) {}
}

class IntType {
  _t = "int";
}

class StringType {
  _t = "string";
}

class InvalidType {
  err = "unknown";
}

class ExprTypes {
  static intType = new IntType();
  static stringType = new StringType();

  find(name: string): ExprType | undefined {
    switch (name) {
      case "int": {
        return ExprTypes.intType;
      }

      case "string": {
        return ExprTypes.stringType;
      }
    }

    return undefined;
  }
}

class Func {
  constructor(
    public params: DList<Field>,
    public ret: ExprType,
    public body: DList<Stmt>
  ) {
    this.params.up = this;
    this.body.up = this;
  }
}

class Field {
  up?: any;
  constructor(public x: string, public ty: ExprType) {}
}

class DefineStmt {
  up?: any;
  used: WeakSet<VarRef> = new WeakSet<VarRef>();

  constructor(
    public x: string,
    public y: Expr,
    public ty: ExprType | undefined
  ) {}
}

class AssignStmt {
  up?: any;
  constructor(public x: Expr, public y: Expr) {}
}

class ExprStmt {
  up?: any;
  constructor(public x: Expr) {}
}

type Stmt = ExprStmt | DefineStmt | AssignStmt;

class BinExpr {
  up?: any;
  lines?: LinesView;

  static kBrace = "brace";
  static kList = "list";

  constructor(
    public list: DList<OpExpr>,
    public ty: ExprType | undefined = undefined
  ) {
    this.list.up = new UpRef(this, BinExpr.kList);
    this.list.v = new OpExpr("", new Const(""));
  }
}

class VarRef {
  up?: any;
  view?: TextDiv;

  constructor(public x: DefineStmt | Field) {}
}

class Const {
  up?: any;
  view?: TextDiv;

  static kX = "x";
  constructor(public x: any, public ty: ExprType | undefined = undefined) {}
}

class OpExpr {
  up?: any;
  opView?: TextDiv;

  static kOp = "op";
  static kX = "x";

  constructor(public op: string, public x: Expr) {
    this.op = op;
    this.setX(x);
  }

  setX(x: Expr) {
    x.up = new UpRef(this, OpExpr.kX);
    this.x = x;
  }
}

type Expr = Const | BinExpr | VarRef;

class StateOpListInsert<T> {
  constructor(
    public head: DList<T>,
    public after: DList<T>,
    public insert: DList<T>
  ) {}

  unOp(): StateOpListRemove<T> {
    return new StateOpListRemove<T>(this.head, this.insert);
  }
}

class StateOpListRemove<T> {
  constructor(public head: DList<T>, public remove: DList<T>) {}

  unOp(): StateOpListInsert<T> {
    return new StateOpListInsert<T>(this.head, this.remove.prev, this.remove);
  }
}

class StateOpSetValue<T> {
  constructor(public n: T, public k: string, public v: any, public oldV: any) {}

  unOp(): StateOpSetValue<T> {
    return new StateOpSetValue(this.n, this.k, this.oldV, this.v);
  }
}

type StateOp =
  | StateOpListRemove<unknown>
  | StateOpListInsert<unknown>
  | StateOpSetValue<unknown>;

class StateOpTuple {
  constructor(public op: StateOp, public unOp: StateOp) {}
}

class LinesView {
  div: HTMLElement;

  constructor(init: HTMLElement[] = []) {
    this.div = document.createElement("div");
    this.div.classList.add("line");
    init.forEach((div) => this.div.appendChild(div));
  }
}

interface UpExpr {
  up?: any;
}

type RenderExpr = Expr | OpExpr;

class ViewAppender {
  constructor(public div: HTMLElement) {}

  append(a: HTMLElement) {
    this.div.after(a);
    this.div = a;
  }
}

interface TextDiv extends HTMLDivElement {
  _up: any;
  _text: Text;
  setText: (v: string) => void;
  clsSep: () => void;
}

class Render {
  va?: ViewAppender;

  static newText(v: string): TextDiv {
    const div = document.createElement("div") as TextDiv;
    div.classList.add("text");

    div.clsSep = () => {
      div.classList.toggle("sep");
    };

    div.setText = (v) => {
      if (div._text && div._text.textContent == v) {
        return;
      }
      if (div._text) {
        div._text.remove();
      }
      const text = document.createTextNode(v);
      div.appendChild(text);
      div._text = text;
    };

    div.setText(v);
    return div;
  }

  upFind(e: UpExpr, check: (x: any) => boolean): any {
    while (e) {
      if (check(e)) {
        return e;
      }
      e = e.up;
    }
    return undefined;
  }

  upLinesView(e: UpExpr): LinesView | undefined {
    return this.upFind(e, (e): boolean => {
      return e instanceof BinExpr && e.lines != undefined;
    });
  }

  rightView(e: RenderExpr): HTMLElement | undefined {
    if (e instanceof BinExpr) {
      return this.rightView(e.list.prev.v!);
    } else if (e instanceof OpExpr) {
      return this.rightView(e.x);
    } else if (e instanceof Const) {
      return e.view;
    } else {
      return undefined;
    }
  }

  exprRemove(e: RenderExpr) {
    if (e instanceof BinExpr) {
      this.exprRemove(e.list.v!);
      e.list.forEachV((e) => {
        this.exprRemove(e);
      });
    } else if (e instanceof OpExpr) {
      e.opView?.remove();
      this.exprRemove(e.x);
    } else if (e instanceof Const) {
      e.view?.remove();
    }
  }

  updateOpExprInsert(op: StateOpListInsert<OpExpr>) {
    const el = op.insert;
    const v = this.rightView(op.after.v!);
    this.va = new ViewAppender(v!);
    this.initExpr0(el.v!);
  }

  updateOpExprRemove(op: StateOpListRemove<OpExpr>) {
    this.exprRemove(op.remove.v!);
  }

  updateOpExprSetValue(op: StateOpSetValue<OpExpr>) {
    if (op.k == OpExpr.kOp) {
      op.n.opView!.innerText = op.v as string;
    } else if (op.k == OpExpr.kX) {
      const v = this.rightView(op.oldV as RenderExpr);
      this.va = new ViewAppender(v!);
      this.initExpr0(op.v as RenderExpr);
      this.exprRemove(op.oldV as RenderExpr);
    }
  }

  updateIdentSetValue(op: StateOpSetValue<Const>) {
    if (op.k == Const.kX) {
      op.n.view!.innerText = op.v as string;
    }
  }

  update(op: StateOp) {
    if (op instanceof StateOpListInsert) {
      const v = op.insert.v;
      if (v instanceof OpExpr) {
        this.updateOpExprInsert(op as StateOpListInsert<OpExpr>);
      }
    } else if (op instanceof StateOpListRemove) {
      const v = op.remove.v;
      if (v instanceof OpExpr) {
        this.updateOpExprRemove(op as StateOpListRemove<OpExpr>);
      }
    } else if (op instanceof StateOpSetValue) {
      const n = op.n;
      if (n instanceof OpExpr) {
        this.updateOpExprSetValue(op as StateOpSetValue<OpExpr>);
      } else if (n instanceof Const) {
        this.updateIdentSetValue(op as StateOpSetValue<Const>);
      }
    }
  }

  static emptyDiv(cls: string): TextDiv {
    const div = Render.newText("");
    div.classList.add(cls);
    return div;
  }

  initEmptyOpExpr(e: OpExpr) {
    const x = new Const("");
    const div = Render.emptyDiv("placeholder-opexpr");
    this.va?.append(div);
    x.view = div;
    e.x = x;
  }

  initExpr0(e: RenderExpr) {
    if (e instanceof BinExpr) {
      this.initEmptyOpExpr(e.list.v as OpExpr);
      e.list.forEach((el) => {
        this.initExpr0(el.v!);
      });
    } else if (e instanceof OpExpr) {
      if (!e.opView) {
        const div = Render.newText(e.op);
        if (e.op != "") {
          div.clsSep();
        }
        this.va?.append(div);
        e.opView = div;
      }
      this.initExpr0(e.x);
    } else if (e instanceof Const) {
      if (!e.view) {
        const div = Render.newText(e.x.toString());
        this.va?.append(div);
        e.view = div;
      }
    }
  }

  initExpr(e: Expr) {
    if (e instanceof BinExpr) {
      const div = Render.emptyDiv("placeholder-line");
      e.lines = new LinesView([div]);
      this.va = new ViewAppender(div);
      this.initExpr0(e);
    }
  }
}

class State {
  oplog: DList<StateOpTuple>;
  curop: DList<StateOpTuple>;

  onUpdate?: (op: StateOp) => void;

  constructor() {
    this.oplog = new DList<StateOpTuple>();
    this.curop = this.oplog;
  }

  doOp(op: StateOp) {
    const unOp = op.unOp();
    this.oplog.appendV(new StateOpTuple(op, unOp));

    if (op instanceof StateOpListInsert) {
      op.head.insertAfter(op.after, op.insert);
    } else if (op instanceof StateOpListRemove) {
      op.head.remove(op.remove);
    } else if (op instanceof StateOpSetValue) {
      const kSetFunc = "set" + op.k.charAt(0).toUpperCase() + op.k.substring(1);
      const n = op.n as DynObj;
      const setFunc = n[kSetFunc];
      if (setFunc) {
        setFunc(op.v);
      } else {
        n[op.k] = op.v;
      }
    }

    if (this.onUpdate) {
      this.onUpdate(op);
    }
  }

  undoOp() {}

  redoOp() {}
}

type TextSelectType = "multi-line" | "single-line" | "single-elem";

class TextSelectState {
  ob?: MutationObserver;
  divL?: HTMLElement;
  divR?: HTMLElement;

  constructor(
    public typ: TextSelectType,
    public l: HTMLElement,
    public r: HTMLElement,
    public lineL: HTMLElement,
    public lineR: HTMLElement
  ) {}

  typRight() {
    return this.typ + "-right";
  }

  typLeft() {
    return this.typ + "-left";
  }

  typMid() {
    return this.typ + "-mid";
  }
}

interface TextSelDiv extends HTMLElement {
  _ts: TextSelect;
  _tsId: number;
}

class TextSelect {
  s?: TextSelectState;

  constructor(public layer: number = 0) {}

  upLine(e: HTMLElement | null): HTMLElement | undefined {
    while (e) {
      if (e.classList.contains("line")) {
        return e;
      }
      e = e.parentElement;
    }
    return undefined;
  }

  newState(l: HTMLElement, r: HTMLElement): TextSelectState {
    const lineL = this.upLine(l)!;
    const lineR = this.upLine(r)!;
    if (lineL == lineR) {
      if (l == r) {
        return new TextSelectState("single-elem", l, r, lineL, lineR);
      } else {
        return new TextSelectState("single-line", l, r, lineL, lineR);
      }
    } else {
      return new TextSelectState("multi-line", l, r, lineL, lineR);
    }
  }

  newDiv(cls: string): HTMLElement {
    const div = document.createElement("div");
    div.classList.add("text-sel");
    div.classList.add(`text-sel-${cls}`);
    div.style.zIndex = `calc(var(--background-z-index) + ${this.layer})`;
    return div;
  }

  renderSingleLineUpdate(div: HTMLElement, s: TextSelectState) {
    const w =
      s.r.getBoundingClientRect().right - s.l.getBoundingClientRect().left;
    div.style.width = w + "px";
  }

  midLineDiv(line: HTMLElement): TextSelDiv | undefined {
    for (let c = line.firstChild; c; c = c!.nextSibling) {
      const div = c as TextSelDiv;
      if (div.classList.contains("text-sel")) {
        if (div._ts == this) {
          return div;
        }
      } else {
        return undefined;
      }
    }
    return undefined;
  }

  forEachMidLine(s: TextSelectState, cb: (line: HTMLElement) => void) {
    for (
      let line = s.lineL.nextElementSibling;
      line && line != s.lineR;
      line = line.nextElementSibling
    ) {
      cb(line as HTMLElement);
    }
  }

  newMidLineDiv(s: TextSelectState, id: number): HTMLElement {
    const div = this.newDiv(s.typMid());
    const tdiv = div as TextSelDiv;
    tdiv._ts = this;
    tdiv._tsId = id;
    return div;
  }

  renderInit(s: TextSelectState) {
    switch (s.typ) {
      case "single-elem": {
        s.divL = this.newDiv(s.typ);
        s.l.prepend(s.divL);
        break;
      }

      case "single-line": {
        s.divL = this.newDiv(s.typLeft());
        this.renderSingleLineUpdate(s.divL, s);
        s.l.prepend(s.divL);
        s.ob = new MutationObserver(() => {
          this.renderSingleLineUpdate(s.divL!, s);
        });
        s.ob.observe(s.lineL, { childList: true, subtree: true });
        break;
      }

      case "multi-line": {
        s.divL = this.newDiv(s.typLeft());
        s.divR = this.newDiv(s.typRight());
        s.l.prepend(s.divL);
        s.r.prepend(s.divR);
        const id = Math.random();
        this.forEachMidLine(s, (line) => {
          line.prepend(this.newMidLineDiv(s, id));
        });
      }
    }
  }

  renderClear(s: TextSelectState) {
    switch (s.typ) {
      case "single-elem": {
        s.divL?.remove();
        break;
      }

      case "single-line": {
        s.divL?.remove();
        s.ob?.disconnect();
        break;
      }

      case "multi-line": {
        s.divL?.remove();
        s.divR?.remove();
        this.forEachMidLine(s, (line) => {
          this.midLineDiv(line)?.remove();
        });
        break;
      }
    }
  }

  renderReinit(s: TextSelectState, ns: TextSelectState) {
    this.renderClear(s);
    this.renderInit(ns);
  }

  updateMultiLine(s: TextSelectState, ns: TextSelectState) {
    if (s.l != ns.l) {
      s.l = ns.l;
      s.l.prepend(s.divL!);
    }
    if (s.r != ns.r) {
      s.r = ns.r;
      s.r.prepend(s.divR!);
    }
    if (s.lineL != ns.lineL || s.lineR != ns.lineR) {
      const newid = Math.random();
      this.forEachMidLine(ns, (line) => {
        const div = this.midLineDiv(line);
        if (div) {
          div._tsId = newid;
        } else {
          line.prepend(this.newMidLineDiv(ns, newid));
        }
      });
      this.forEachMidLine(s, (line) => {
        const div = this.midLineDiv(line);
        if (div) {
          if (div._tsId != newid) {
            div.remove();
          }
        }
      });
    }
  }

  renderUpdate(s: TextSelectState, ns: TextSelectState) {
    if (s.typ == ns.typ) {
      switch (s.typ) {
        case "single-elem": {
          if (s.l != ns.l) {
            s.l = ns.l;
            s.l.prepend(s.divL!);
          }
          break;
        }

        case "single-line": {
          if (s.l != ns.l) {
            s.l = ns.l;
            s.r = ns.r;
            s.l.prepend(s.divL!);
            this.renderSingleLineUpdate(s.divL!, s);
          } else if (s.r != ns.r) {
            s.r = ns.r;
            this.renderSingleLineUpdate(s.divL!, s);
          }
          break;
        }

        case "multi-line": {
          this.updateMultiLine(s, ns);
          break;
        }
      }
    } else {
      this.renderReinit(s, ns);
      this.s = ns;
    }
  }

  select(l: HTMLElement, r: HTMLElement = l) {
    const ns = this.newState(l, r);
    if (this.s) {
      this.renderUpdate(this.s, ns);
    } else {
      this.renderInit(ns);
      this.s = ns;
    }
  }
}

class TextSelectListener {
  constructor(
    public cb: (selElem: HTMLElement, left: number, offset: number) => void
  ) {}

  handler() {
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

    this.cb(selElem, left, offset);
  }

  attach() {
    document.addEventListener("selectionchange", this.handler);
  }

  detach() {
    document.removeEventListener("selectionchange", this.handler);
  }
}

class Codegen {
  code: string[] = [];

  private genExpr(e: Expr) {
    if (e instanceof BinExpr) {
      e.list.forEachV((e, i) => {
        if (i > 0) {
          this.code.push(e.op);
        }
        this.genExpr(e.x);
      });
    } else if (e instanceof Const) {
      this.code.push(e.x.toString());
    }
  }

  gen(e: Expr): () => string {
    this.code = [];
    this.genExpr(e);
    const body = "return " + this.code.join("");
    return new Function(body) as () => string;
  }
}

function testTextSelect() {
  const editor = document.createElement("div");
  editor.classList.add("editor");

  const lines: TextDiv[][] = [];
  const linedivs: HTMLElement[] = [];
  for (let i = 0; i < 20; i++) {
    const div = document.createElement("div");
    div.classList.add("line");

    const line: TextDiv[] = [];
    for (let j = 0; j < 20; j++) {
      const text = Render.newText(j.toString());
      text.classList.add("word");
      div.appendChild(text);
      line.push(text);
    }

    linedivs.push(div);
    lines.push(line);
    editor.appendChild(div);
  }

  const ts = new TextSelect();
  ts.select(lines[6][3], lines[6][4]);

  const ts2 = new TextSelect();
  ts2.select(lines[1][3], lines[5][1]);

  lines[6][3].setText("1133");
}

{
  const editor = document.querySelector<HTMLDivElement>(".editor")!;

  const state = new State();
  const render = new Render();

  state.onUpdate = (op) => {
    render.update(op);
  };

  const firstIdent = new Const(1, ExprTypes.intType);
  const firstOpExpr = new OpExpr("", firstIdent);
  const e = new BinExpr(
    DList.newList<OpExpr>([
      firstOpExpr,
      new OpExpr("+", new Const(2, ExprTypes.intType)),
      new OpExpr("+", new Const(3, ExprTypes.intType)),
    ]),
    ExprTypes.intType
  );

  render.initExpr(e);
  editor.appendChild(e.lines!.div);

  // for (let i = 0; i < 20; i++) {
  //   const op = new StateOpListInsert(
  //     e.list,
  //     e.list.prev,
  //     DList.new<OpExpr>(new OpExpr("+", new Ident((i + 10).toString())))
  //   );
  //   state.doOp(op);
  // }

  const cg = new Codegen();
  const fn = cg.gen(e);
  const ret = fn();
  console.log(ret);

  const preview = document.querySelector<HTMLDivElement>(".preview")!;
  preview.innerText = ret.toString();
}
