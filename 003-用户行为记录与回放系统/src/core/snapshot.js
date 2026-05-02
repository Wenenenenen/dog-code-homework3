/**
 * DOM 快照服务 - 用于捕获和还原 DOM 状态
 * 简化实现：专注于表单状态、滚动位置、样式状态
 */

/**
 * 表单元素类型
 */
const FORM_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']

/**
 * 可输入的 input 类型
 */
const INPUT_TYPES = [
  'text', 'password', 'email', 'number', 'tel', 'url',
  'search', 'date', 'datetime-local', 'time', 'month', 'week',
  'textarea', 'select-one', 'select-multiple'
]

/**
 * DOM 快照类
 */
export class DOMSnapshot {
  constructor() {
    this._snapshotData = null
  }

  /**
   * 捕获完整的 DOM 状态快照
   * @param {HTMLElement|Document} [root=document] - 根元素
   * @returns {Object} 快照数据
   */
  capture(root = document) {
    const snapshot = {
      timestamp: Date.now(),
      url: window.location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      formStates: this._captureFormStates(root),
      scrollPositions: this._captureScrollPositions(root),
      elementStates: this._captureElementStates(root),
      cssClasses: this._captureCSSClasses(root)
    }

    this._snapshotData = snapshot
    return snapshot
  }

  /**
   * 还原 DOM 状态到快照
   * @param {Object} snapshot - 快照数据
   * @param {HTMLElement|Document} [root=document] - 根元素
   */
  restore(snapshot, root = document) {
    if (!snapshot) {
      console.warn('No snapshot data to restore')
      return
    }

    console.log('Restoring DOM snapshot...')

    // 按顺序还原状态
    this._restoreScrollPositions(snapshot.scrollPositions, root)
    this._restoreFormStates(snapshot.formStates, root)
    this._restoreElementStates(snapshot.elementStates, root)
    this._restoreCSSClasses(snapshot.cssClasses, root)

    console.log('DOM snapshot restored')
  }

  /**
   * 获取当前快照数据
   * @returns {Object|null}
   */
  getSnapshot() {
    return this._snapshotData
  }

  /**
   * 捕获表单状态
   * @private
   * @param {HTMLElement|Document} root
   * @returns {Array}
   */
  _captureFormStates(root) {
    const states = []
    const elements = root.querySelectorAll('input, textarea, select')

    elements.forEach((element, index) => {
      const state = this._getElementFormState(element, index)
      if (state) {
        states.push(state)
      }
    })

    return states
  }

  /**
   * 获取单个元素的表单状态
   * @private
   * @param {HTMLElement} element
   * @param {number} index
   * @returns {Object|null}
   */
  _getElementFormState(element, index) {
    const selector = this._generateStableSelector(element)
    const tagName = element.tagName.toLowerCase()

    let state = {
      selector,
      tagName,
      index,
      id: element.id || null,
      name: element.name || null
    }

    switch (tagName) {
      case 'input':
        return this._getInputState(element, state)
      case 'textarea':
        return this._getTextareaState(element, state)
      case 'select':
        return this._getSelectState(element, state)
      default:
        return null
    }
  }

  /**
   * 获取 input 元素状态
   * @private
   */
  _getInputState(element, state) {
    const type = element.type || 'text'
    state.inputType = type

    switch (type) {
      case 'checkbox':
      case 'radio':
        state.value = element.value
        state.checked = element.checked
        break
      case 'file':
        state.value = ''
        break
      case 'hidden':
        state.value = element.value
        break
      default:
        if (INPUT_TYPES.includes(type)) {
          state.value = element.value
        } else {
          state.value = element.value || ''
        }
    }

    return state
  }

  /**
   * 获取 textarea 元素状态
   * @private
   */
  _getTextareaState(element, state) {
    state.inputType = 'textarea'
    state.value = element.value
    return state
  }

  /**
   * 获取 select 元素状态
   * @private
   */
  _getSelectState(element, state) {
    state.inputType = element.multiple ? 'select-multiple' : 'select-one'
    state.value = element.value

    state.selectedOptions = Array.from(element.selectedOptions).map(opt => ({
      value: opt.value,
      text: opt.text,
      index: opt.index
    }))

    return state
  }

  /**
   * 捕获滚动位置
   * @private
   */
  _captureScrollPositions(root) {
    const positions = []

    positions.push({
      isWindow: true,
      selector: 'window',
      scrollTop: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
      scrollLeft: window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0
    })

    const scrollableElements = root.querySelectorAll('*')
    scrollableElements.forEach((element, index) => {
      if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
        const style = window.getComputedStyle(element)
        if (style.overflow !== 'visible' || style.overflowY !== 'visible') {
          positions.push({
            isWindow: false,
            selector: this._generateStableSelector(element),
            index,
            scrollTop: element.scrollTop,
            scrollLeft: element.scrollLeft,
            tagName: element.tagName
          })
        }
      }
    })

    return positions
  }

  /**
   * 捕获元素状态（disabled, hidden 等）
   * @private
   */
  _captureElementStates(root) {
    const states = []
    const elements = root.querySelectorAll('*')

    elements.forEach((element, index) => {
      const state = {
        selector: this._generateStableSelector(element),
        index,
        tagName: element.tagName
      }

      let hasState = false

      if ('disabled' in element) {
        state.disabled = element.disabled
        hasState = true
      }
      if ('hidden' in element) {
        state.hidden = element.hidden
        hasState = true
      }
      if ('readOnly' in element) {
        state.readOnly = element.readOnly
        hasState = true
      }

      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') {
        state.display = style.display
        state.visibility = style.visibility
        hasState = true
      }

      if (hasState) {
        states.push(state)
      }
    })

    return states
  }

  /**
   * 捕获 CSS 类名
   * @private
   */
  _captureCSSClasses(root) {
    const classes = []
    const elements = root.querySelectorAll('[class]')

    elements.forEach((element, index) => {
      if (element.className && typeof element.className === 'string' && element.className.trim()) {
        classes.push({
          selector: this._generateStableSelector(element),
          index,
          tagName: element.tagName,
          className: element.className,
          classList: Array.from(element.classList)
        })
      }
    })

    return classes
  }

  /**
   * 还原表单状态
   * @private
   */
  _restoreFormStates(formStates, root) {
    if (!formStates || formStates.length === 0) return

    formStates.forEach(state => {
      const element = this._findElementBySelector(state.selector, state.index, root)

      if (!element) {
        console.warn('Element not found for form state:', state.selector)
        return
      }

      this._restoreElementFormState(element, state)
    })
  }

  /**
   * 还原单个元素的表单状态
   * @private
   */
  _restoreElementFormState(element, state) {
    const tagName = element.tagName.toLowerCase()

    if (tagName !== state.tagName) {
      console.warn('Tag name mismatch:', tagName, 'vs', state.tagName)
      return
    }

    switch (tagName) {
      case 'input':
        this._restoreInputState(element, state)
        break
      case 'textarea':
        this._restoreTextareaState(element, state)
        break
      case 'select':
        this._restoreSelectState(element, state)
        break
    }
  }

  /**
   * 还原 input 状态
   * @private
   */
  _restoreInputState(element, state) {
    const type = element.type || 'text'

    switch (type) {
      case 'checkbox':
      case 'radio':
        if (state.value !== undefined) {
          element.value = state.value
        }
        if (state.checked !== undefined) {
          element.checked = state.checked
        }
        element.dispatchEvent(new Event('change', { bubbles: true }))
        break
      case 'file':
        break
      default:
        if (state.value !== undefined) {
          element.value = state.value
          element.dispatchEvent(new Event('input', { bubbles: true }))
          element.dispatchEvent(new Event('change', { bubbles: true }))
        }
    }
  }

  /**
   * 还原 textarea 状态
   * @private
   */
  _restoreTextareaState(element, state) {
    if (state.value !== undefined) {
      element.value = state.value
      element.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  /**
   * 还原 select 状态
   * @private
   */
  _restoreSelectState(element, state) {
    if (state.value !== undefined) {
      element.value = state.value
    }

    if (state.selectedOptions && state.selectedOptions.length > 0) {
      if (element.multiple) {
        Array.from(element.options).forEach(opt => {
          opt.selected = state.selectedOptions.some(s => 
            s.value === opt.value || s.index === opt.index
          )
        })
      }
    }

    element.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /**
   * 还原滚动位置
   * @private
   */
  _restoreScrollPositions(scrollPositions, root) {
    if (!scrollPositions || scrollPositions.length === 0) return

    scrollPositions.forEach(position => {
      if (position.isWindow || position.selector === 'window') {
        window.scrollTo({
          left: position.scrollLeft || 0,
          top: position.scrollTop || 0,
          behavior: 'auto'
        })
      } else {
        const element = this._findElementBySelector(position.selector, position.index, root)
        if (element) {
          element.scrollTop = position.scrollTop || 0
          element.scrollLeft = position.scrollLeft || 0
        } else {
          console.warn('Scroll element not found:', position.selector)
        }
      }
    })
  }

  /**
   * 还原元素状态
   * @private
   */
  _restoreElementStates(elementStates, root) {
    if (!elementStates || elementStates.length === 0) return

    elementStates.forEach(state => {
      const element = this._findElementBySelector(state.selector, state.index, root)

      if (!element) return

      if (state.disabled !== undefined && 'disabled' in element) {
        element.disabled = state.disabled
      }
      if (state.hidden !== undefined && 'hidden' in element) {
        element.hidden = state.hidden
      }
      if (state.readOnly !== undefined && 'readOnly' in element) {
        element.readOnly = state.readOnly
      }
    })
  }

  /**
   * 还原 CSS 类名
   * @private
   */
  _restoreCSSClasses(cssClasses, root) {
    if (!cssClasses || cssClasses.length === 0) return

    cssClasses.forEach(classState => {
      const element = this._findElementBySelector(classState.selector, classState.index, root)

      if (!element) return

      if (classState.className !== undefined) {
        element.className = classState.className
      }
    })
  }

  /**
   * 生成稳定的 CSS 选择器
   * @private
   * @param {HTMLElement} element
   * @returns {string}
   */
  _generateStableSelector(element) {
    if (element.id) {
      return `#${element.id}`
    }

    const path = []
    let current = element

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase()

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => 
          c && !c.includes('react') && !c.includes('sc-')
        )
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.')
        }
      }

      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === current.tagName
        )
        if (siblings.length > 1) {
          const index = siblings.indexOf(current)
          if (index > 0) {
            selector += `:nth-of-type(${index + 1})`
          }
        }
      }

      path.unshift(selector)

      if (current === document.body || path.length > 6) {
        break
      }

      current = current.parentElement
    }

    return path.join(' > ')
  }

  /**
   * 通过选择器查找元素
   * @private
   * @param {string} selector
   * @param {number} [index]
   * @param {HTMLElement|Document} root
   * @returns {HTMLElement|null}
   */
  _findElementBySelector(selector, index, root = document) {
    if (!selector) return null

    try {
      if (selector === 'window') {
        return null
      }

      const elements = root.querySelectorAll(selector)

      if (elements.length === 0) {
        return this._fallbackFindElement(selector, root)
      }

      if (index !== undefined && index >= 0 && index < elements.length) {
        return elements[index]
      }

      return elements[0]
    } catch (e) {
      console.error('Error finding element by selector:', selector, e)
      return null
    }
  }

  /**
   * 降级查找元素
   * @private
   */
  _fallbackFindElement(selector, root) {
    try {
      const parts = selector.split('>').map(p => p.trim())
      if (parts.length === 0) return null

      const tagName = parts[parts.length - 1].match(/^[a-z]+/i)?.[0]
      if (!tagName) return null

      const elements = root.querySelectorAll(tagName.toLowerCase())
      return elements[0] || null
    } catch (e) {
      return null
    }
  }
}

export const domSnapshot = new DOMSnapshot()
