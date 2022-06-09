import { jsx } from 'slate-hyperscript';
import { Text } from 'slate';
import React from 'react';
import escapeHtml from 'escape-html';
export type LeafType = {
  type: string
  vaildation?: (node: HTMLElement) => boolean,
  tag: string
  render: React.FC<{attributes: any, leaf: any, children: any}>// 渲染leaf的函数 
  serialize?: (node: any, children: any) => any,
  deserialize?:(node:HTMLElement)=> any
}
export type ElementType = {
  type: string
  vaildation?: (node: HTMLElement) => boolean,
  tag: string
  render: React.FC<{attributes: any, element: any, children: any}>// 渲染leaf的函数 
  serialize?: (node: any, children: any) => any,
  deserialize?:(node:HTMLElement)=> any
}

export const parseHtml = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc;
}

export const renderElement = (elements: ElementType[]): (node: any) => any => {
  return (node: any) => {
    const Element = elements.find(block => block.type === node.element.type);

    if (Element) {
      return <Element.render element={node.element} attributes={node.attributes}>{node.children}</Element.render>
    }
    return <p {...node.attribute}>{node.children}</p>;
  }
}

export const renderLeaf = (leafs: LeafType[]): (node: any) => any => {
  return (node: any) => {
    const Mark = leafs.filter(mark => node.leaf[mark.type]);
    let children = node.children;
    if (Mark) {
      Mark.forEach(Leaf => {
        children = <Leaf.render leaf={node.leaf} attributes={node.attributes}>{children}</Leaf.render>
      })
    }
    return <span {...node.attributes}>{children}</span>;
  }
}

export class SlateRender {
  marks: LeafType[]
  blocks: ElementType[]
  constructor(opts: { marks: LeafType[], elements: ElementType[]}) {
    this.marks = opts.marks || []
    this.blocks = opts.elements || []
  }
  renderElement(node: any): any { // attributes, children, element
    return <p></p>
  }
  renderLeaf(node: any): any { // attribue children leaf
    return <></>
  }
  serialize(node: any) {
    // 序列化
    if (Text.isText(node)) {
      // 读取marks,考虑多marks的场景
      const Mark = this.marks.filter(mark => node[mark.type]);
      if (Mark.length >= 1) {
        return Mark.reduce((pre, cur) => {
          return cur.serialize && cur.serialize(node, pre)
        }, node.text)
      }
      return escapeHtml(node.text)
    }
    // 处理block
    const children = node.children.map((n: any) => this.serialize(n));
    const element = this.blocks.find(block => block.type === node.type);
    if (element && element.serialize) {
      return element.serialize(node, children.join(''))
    }
    return children;
  }

  deserialize(el: HTMLElement, attributes: any = {}): any {

    if (el.nodeType === Node.TEXT_NODE) {
      // 如果是文本
      return jsx('text', { ...attributes }, el.textContent);
    }
    // 如果是marks
    const Marks = this.marks.find(block => block.vaildation && block.vaildation(el));
    // 校验成功
    if (Marks && Marks.deserialize) {
      attributes = Marks.deserialize(el);
    }
    const childNodes = Array.from(el.childNodes).map(node => this.deserialize((node as HTMLElement), attributes)).flat();
    // 文本节点
    if (childNodes.length === 0) {
      childNodes.push(jsx('text', attributes, ''));
    }
    // 如果是元素
    const Element = this.blocks.find(block => block.vaildation && block.vaildation(el));
    // 如果校验通过
    if (Element) {
      const attribue = Element.deserialize ?  Element.deserialize(el) : {}
      return jsx('element', { type: Element.type, ...attribue }, childNodes);
    }
    return childNodes
  }
}
export const Entry = (marks, elements) => {
  const render = new SlateRender({
    marks: marks,
    elements: elements
  })
  render.renderElement = renderElement(render.blocks)
  render.renderLeaf = renderLeaf(render.marks)
  return render
}
