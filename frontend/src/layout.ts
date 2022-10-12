
export interface GraphSettings {
  offset: number
  time_diff: number
  y_scale: number
  x_sep: number
  y_sep: number
  hue: number
}

export class StatefulLayout {
  private timee = 0
  private posx = 0
  private posy = 0
  private log = 1
  private curve = 0
  private curveSep = 0
  private colors = new Map<string, string>()
  private shapes = new Map<string, string>()
  private shapeArray = ["circle", "rect", "ellipse", "diamond", "star"]

  apply(node: any, graphOptions: GraphSettings) {
    if (this.curve === 0 && graphOptions.offset) {
      this.curve = graphOptions.offset
      this.curveSep = graphOptions.offset
    }
    node.style = {
      fill: this.nodeColor(node.event_type, graphOptions.hue),
      lineWidth: 0.4,
    }
    node.size = 10
    node.type = this.nodeShape(node.event_type)
    node.label = node.event_type
    node.labelCfg = {
      style: {
        fill: '#9254de',
        fontSize: 10,
      },
      position: 'right',
    }
    const temp = node
    const tempTime: number = temp.time
    if (tempTime <= this.timee + graphOptions.time_diff) {
      temp.x = this.posx + this.curve
      if (this.posy < 0) {
        temp.y = this.posy
        this.posy =
          this.posy * -1 + graphOptions.y_sep * graphOptions.y_scale ** this.log
        this.log += 1
        this.curve += this.curveSep
      } else {
        temp.y = this.posy
        if (this.posy !== 0) {
          this.posy *= -1
        }
      }
    } else if (tempTime > this.timee) {
      this.posx = this.posx + this.curve + graphOptions.x_sep
      temp.x = this.posx
      this.curve = 0
      this.posy = 0
      this.log = 1
      temp.y = this.posy
      this.posy += graphOptions.y_sep
      this.timee = tempTime
    }
  }
  nodeShape(eventType: string) {
    // if a new event type are created, we generate a random integer between 0-4 as the index of shape array.
    if (!this.shapes.has(eventType)) {
      const shape = this.shapeArray[Math.floor(Math.random() * this.shapeArray.length)]
      console.log(shape)
      this.shapes.set(eventType, shape)
    }
    return this.shapes.get(eventType)
  }

  nodeColor(eventType: string, hue?: number) {
    if (!this.colors.has(eventType)) {
      const hash = [...eventType].reduce(
        (acc, char) => char.charCodeAt(0) + ((acc << 1) - acc),
        2
      )
      const color = `hsl(${hash % (hue ? hue : 360)},50%,50%)`
      this.colors.set(eventType, color)
    }
    return this.colors.get(eventType)
  }
  // return the shape of node
  getNodeShape() {
    return this.shapes
  }

  getNodeColor() {
    return this.colors
  }
}
