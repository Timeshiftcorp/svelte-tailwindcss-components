
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
function noop() {}

const identity = x => x;

function assign(tar, src) {
  // @ts-ignore
  for (const k in src) tar[k] = src[k];

  return tar;
}

function add_location(element, file, line, column, char) {
  element.__svelte_meta = {
    loc: {
      file,
      line,
      column,
      char
    }
  };
}

function run(fn) {
  return fn();
}

function blank_object() {
  return Object.create(null);
}

function run_all(fns) {
  fns.forEach(run);
}

function is_function(thing) {
  return typeof thing === 'function';
}

function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a && typeof a === 'object' || typeof a === 'function';
}

function create_slot(definition, ctx, fn) {
  if (definition) {
    const slot_ctx = get_slot_context(definition, ctx, fn);
    return definition[0](slot_ctx);
  }
}

function get_slot_context(definition, ctx, fn) {
  return definition[1] ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {}))) : ctx.$$scope.ctx;
}

function get_slot_changes(definition, ctx, changed, fn) {
  return definition[1] ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {}))) : ctx.$$scope.changed || {};
}

const is_client = typeof window !== 'undefined';
let now = is_client ? () => window.performance.now() : () => Date.now();

let raf = cb => requestAnimationFrame(cb); // used internally for testing

const tasks = new Set();
let running = false;

function run_tasks() {
  tasks.forEach(task => {
    if (!task[0](now())) {
      tasks.delete(task);
      task[1]();
    }
  });
  running = tasks.size > 0;
  if (running) raf(run_tasks);
}

function loop(fn) {
  let task;

  if (!running) {
    running = true;
    raf(run_tasks);
  }

  return {
    promise: new Promise(fulfil => {
      tasks.add(task = [fn, fulfil]);
    }),

    abort() {
      tasks.delete(task);
    }

  };
}

function append(target, node) {
  target.appendChild(node);
}

function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}

function detach(node) {
  node.parentNode.removeChild(node);
}

function element(name) {
  return document.createElement(name);
}

function text(data) {
  return document.createTextNode(data);
}

function space() {
  return text(' ');
}

function empty() {
  return text('');
}

function listen(node, event, handler, options) {
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}

function attr(node, attribute, value) {
  if (value == null) node.removeAttribute(attribute);else node.setAttribute(attribute, value);
}

function children(element) {
  return Array.from(element.childNodes);
}

function set_data(text, data) {
  data = '' + data;
  if (text.data !== data) text.data = data;
}

function custom_event(type, detail) {
  const e = document.createEvent('CustomEvent');
  e.initCustomEvent(type, false, false, detail);
  return e;
}

let stylesheet;
let active = 0;
let current_rules = {}; // https://github.com/darkskyapp/string-hash/blob/master/index.js

function hash(str) {
  let hash = 5381;
  let i = str.length;

  while (i--) hash = (hash << 5) - hash ^ str.charCodeAt(i);

  return hash >>> 0;
}

function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
  const step = 16.666 / duration;
  let keyframes = '{\n';

  for (let p = 0; p <= 1; p += step) {
    const t = a + (b - a) * ease(p);
    keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
  }

  const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
  const name = `__svelte_${hash(rule)}_${uid}`;

  if (!current_rules[name]) {
    if (!stylesheet) {
      const style = element('style');
      document.head.appendChild(style);
      stylesheet = style.sheet;
    }

    current_rules[name] = true;
    stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
  }

  const animation = node.style.animation || '';
  node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
  active += 1;
  return name;
}

function delete_rule(node, name) {
  node.style.animation = (node.style.animation || '').split(', ').filter(name ? anim => anim.indexOf(name) < 0 // remove specific animation
  : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
  ).join(', ');
  if (name && ! --active) clear_rules();
}

function clear_rules() {
  raf(() => {
    if (active) return;
    let i = stylesheet.cssRules.length;

    while (i--) stylesheet.deleteRule(i);

    current_rules = {};
  });
}

let current_component;

function set_current_component(component) {
  current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;

function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}

function add_render_callback(fn) {
  render_callbacks.push(fn);
}

function flush() {
  const seen_callbacks = new Set();

  do {
    // first, call beforeUpdate functions
    // and update components
    while (dirty_components.length) {
      const component = dirty_components.shift();
      set_current_component(component);
      update(component.$$);
    }

    while (binding_callbacks.length) binding_callbacks.pop()(); // then, once components are updated, call
    // afterUpdate functions. This may cause
    // subsequent updates...


    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];

      if (!seen_callbacks.has(callback)) {
        callback(); // ...so guard against infinite loops

        seen_callbacks.add(callback);
      }
    }

    render_callbacks.length = 0;
  } while (dirty_components.length);

  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }

  update_scheduled = false;
}

function update($$) {
  if ($$.fragment) {
    $$.update($$.dirty);
    run_all($$.before_update);
    $$.fragment.p($$.dirty, $$.ctx);
    $$.dirty = null;
    $$.after_update.forEach(add_render_callback);
  }
}

let promise;

function wait() {
  if (!promise) {
    promise = Promise.resolve();
    promise.then(() => {
      promise = null;
    });
  }

  return promise;
}

function dispatch(node, direction, kind) {
  node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}

const outroing = new Set();
let outros;

function group_outros() {
  outros = {
    r: 0,
    c: [],
    p: outros // parent group

  };
}

function check_outros() {
  if (!outros.r) {
    run_all(outros.c);
  }

  outros = outros.p;
}

function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}

function transition_out(block, local, detach, callback) {
  if (block && block.o) {
    if (outroing.has(block)) return;
    outroing.add(block);
    outros.c.push(() => {
      outroing.delete(block);

      if (callback) {
        if (detach) block.d(1);
        callback();
      }
    });
    block.o(local);
  }
}

function create_bidirectional_transition(node, fn, params, intro) {
  let config = fn(node, params);
  let t = intro ? 0 : 1;
  let running_program = null;
  let pending_program = null;
  let animation_name = null;

  function clear_animation() {
    if (animation_name) delete_rule(node, animation_name);
  }

  function init(program, duration) {
    const d = program.b - t;
    duration *= Math.abs(d);
    return {
      a: t,
      b: program.b,
      d,
      duration,
      start: program.start,
      end: program.start + duration,
      group: program.group
    };
  }

  function go(b) {
    const {
      delay = 0,
      duration = 300,
      easing = identity,
      tick = noop,
      css
    } = config;
    const program = {
      start: now() + delay,
      b
    };

    if (!b) {
      // @ts-ignore todo: improve typings
      program.group = outros;
      outros.r += 1;
    }

    if (running_program) {
      pending_program = program;
    } else {
      // if this is an intro, and there's a delay, we need to do
      // an initial tick and/or apply CSS animation immediately
      if (css) {
        clear_animation();
        animation_name = create_rule(node, t, b, duration, delay, easing, css);
      }

      if (b) tick(0, 1);
      running_program = init(program, duration);
      add_render_callback(() => dispatch(node, b, 'start'));
      loop(now => {
        if (pending_program && now > pending_program.start) {
          running_program = init(pending_program, duration);
          pending_program = null;
          dispatch(node, running_program.b, 'start');

          if (css) {
            clear_animation();
            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
          }
        }

        if (running_program) {
          if (now >= running_program.end) {
            tick(t = running_program.b, 1 - t);
            dispatch(node, running_program.b, 'end');

            if (!pending_program) {
              // we're done
              if (running_program.b) {
                // intro — we can tidy up immediately
                clear_animation();
              } else {
                // outro — needs to be coordinated
                if (! --running_program.group.r) run_all(running_program.group.c);
              }
            }

            running_program = null;
          } else if (now >= running_program.start) {
            const p = now - running_program.start;
            t = running_program.a + running_program.d * easing(p / running_program.duration);
            tick(t, 1 - t);
          }
        }

        return !!(running_program || pending_program);
      });
    }
  }

  return {
    run(b) {
      if (is_function(config)) {
        wait().then(() => {
          // @ts-ignore
          config = config();
          go(b);
        });
      } else {
        go(b);
      }
    },

    end() {
      clear_animation();
      running_program = pending_program = null;
    }

  };
}

function mount_component(component, target, anchor) {
  const {
    fragment,
    on_mount,
    on_destroy,
    after_update
  } = component.$$;
  fragment.m(target, anchor); // onMount happens before the initial afterUpdate

  add_render_callback(() => {
    const new_on_destroy = on_mount.map(run).filter(is_function);

    if (on_destroy) {
      on_destroy.push(...new_on_destroy);
    } else {
      // Edge case - component was destroyed immediately,
      // most likely as a result of a binding initialising
      run_all(new_on_destroy);
    }

    component.$$.on_mount = [];
  });
  after_update.forEach(add_render_callback);
}

function destroy_component(component, detaching) {
  if (component.$$.fragment) {
    run_all(component.$$.on_destroy);
    component.$$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
    // preserve final state?)

    component.$$.on_destroy = component.$$.fragment = null;
    component.$$.ctx = {};
  }
}

function make_dirty(component, key) {
  if (!component.$$.dirty) {
    dirty_components.push(component);
    schedule_update();
    component.$$.dirty = blank_object();
  }

  component.$$.dirty[key] = true;
}

function init(component, options, instance, create_fragment, not_equal, prop_names) {
  const parent_component = current_component;
  set_current_component(component);
  const props = options.props || {};
  const $$ = component.$$ = {
    fragment: null,
    ctx: null,
    // state
    props: prop_names,
    update: noop,
    not_equal,
    bound: blank_object(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    before_update: [],
    after_update: [],
    context: new Map(parent_component ? parent_component.$$.context : []),
    // everything else
    callbacks: blank_object(),
    dirty: null
  };
  let ready = false;
  $$.ctx = instance ? instance(component, props, (key, value) => {
    if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
      if ($$.bound[key]) $$.bound[key](value);
      if (ready) make_dirty(component, key);
    }
  }) : props;
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment($$.ctx);

  if (options.target) {
    if (options.hydrate) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      $$.fragment.l(children(options.target));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      $$.fragment.c();
    }

    if (options.intro) transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor);
    flush();
  }

  set_current_component(parent_component);
}

class SvelteComponent {
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop;
  }

  $on(type, callback) {
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    };
  }

  $set() {// overridden by instance, if it has props
  }

}

class SvelteComponentDev extends SvelteComponent {
  constructor(options) {
    if (!options || !options.target && !options.$$inline) {
      throw new Error(`'target' is a required option`);
    }

    super();
  }

  $destroy() {
    super.$destroy();

    this.$destroy = () => {
      console.warn(`Component was already destroyed`); // eslint-disable-line no-console
    };
  }

}

function fade(node, {
  delay = 0,
  duration = 400
}) {
  const o = +getComputedStyle(node).opacity;
  return {
    delay,
    duration,
    css: t => `opacity: ${t * o}`
  };
}

/* src\components\base\Modal\index.svelte generated by Svelte v3.6.9 */

const file = "src\\components\\base\\Modal\\index.svelte";

const get_default_slot_changes = ({ handleClose }) => ({});
const get_default_slot_context = ({ handleClose }) => ({ handle: handleClose });

const get_button_slot_changes = ({ handleClose }) => ({});
const get_button_slot_context = ({ handleClose }) => ({ handle: handleClose });

// (28:0) {#if showModal}
function create_if_block(ctx) {
	var div0, div0_transition, t0, div3, div2, button, t2, span, t3, div1, t4, hr, div2_transition, current, dispose;

	const default_slot_1 = ctx.$$slots.default;
	const default_slot = create_slot(default_slot_1, ctx, get_default_slot_context);

	return {
		c: function create() {
			div0 = element("div");
			t0 = space();
			div3 = element("div");
			div2 = element("div");
			button = element("button");
			button.textContent = "X";
			t2 = space();
			span = element("span");
			t3 = space();
			div1 = element("div");

			if (default_slot) default_slot.c();
			t4 = space();
			hr = element("hr");
			attr(div0, "class", "fixed top-0 left-0 w-full h-full bg-gray-100");
			add_location(div0, file, 28, 2, 648);
			attr(button, "class", "self-end  text-xs  pr-1 ");
			add_location(button, file, 31, 4, 1014);
			attr(span, "class", "w-full h-1 bg-gray-100  shadow ");
			add_location(span, file, 35, 4, 1128);

			attr(div1, "class", "p-4 pb-0");
			add_location(div1, file, 36, 4, 1187);
			add_location(hr, file, 39, 4, 1263);
			attr(div2, "class", "flex flex-col  max-w-2xl  bg-white justify-center items-end");
			add_location(div2, file, 30, 4, 899);
			attr(div3, "class", "flex fixed flex-col justify-center items-center  inset-0");
			add_location(div3, file, 29, 4, 787);

			dispose = [
				listen(div0, "click", ctx.click_handler_1),
				listen(button, "click", ctx.click_handler_2),
				listen(div3, "click", ctx.click_handler_3)
			];
		},

		l: function claim(nodes) {
			if (default_slot) default_slot.l(div1_nodes);
		},

		m: function mount(target, anchor) {
			insert(target, div0, anchor);
			insert(target, t0, anchor);
			insert(target, div3, anchor);
			append(div3, div2);
			append(div2, button);
			append(div2, t2);
			append(div2, span);
			append(div2, t3);
			append(div2, div1);

			if (default_slot) {
				default_slot.m(div1, null);
			}

			append(div2, t4);
			append(div2, hr);
			current = true;
		},

		p: function update(changed, ctx) {
			if (default_slot && default_slot.p && changed.$$scope) {
				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, get_default_slot_changes), get_slot_context(default_slot_1, ctx, get_default_slot_context));
			}
		},

		i: function intro(local) {
			if (current) return;
			add_render_callback(() => {
				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, { duration: 250 }, true);
				div0_transition.run(1);
			});

			transition_in(default_slot, local);

			add_render_callback(() => {
				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 250 }, true);
				div2_transition.run(1);
			});

			current = true;
		},

		o: function outro(local) {
			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, { duration: 250 }, false);
			div0_transition.run(0);

			transition_out(default_slot, local);

			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 250 }, false);
			div2_transition.run(0);

			current = false;
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(div0);
				if (div0_transition) div0_transition.end();
				detach(t0);
				detach(div3);
			}

			if (default_slot) default_slot.d(detaching);

			if (detaching) {
				if (div2_transition) div2_transition.end();
			}

			run_all(dispose);
		}
	};
}

function create_fragment(ctx) {
	var button, t0, button_class_value, dispose_button_slot, t1, if_block_anchor, current;

	const button_slot_1 = ctx.$$slots.button;
	const button_slot = create_slot(button_slot_1, ctx, get_button_slot_context);

	var if_block = (ctx.showModal) && create_if_block(ctx);

	return {
		c: function create() {
			if (!button_slot) {
				button = element("button");
				t0 = text(ctx.buttonName);
			}

			if (button_slot) button_slot.c();
			t1 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			if (!button_slot) {
				attr(button, "class", button_class_value = "" + ctx.buttonColor + " hover:" + ctx.buttonHover() + " text-white font-bold py-2 px-4\r\n    rounded");
				add_location(button, file, 21, 2, 454);
				dispose_button_slot = listen(button, "click", ctx.click_handler);
			}
		},

		l: function claim(nodes) {
			if (button_slot) button_slot.l(nodes);
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},

		m: function mount(target, anchor) {
			if (!button_slot) {
				insert(target, button, anchor);
				append(button, t0);
			}

			else {
				button_slot.m(target, anchor);
			}

			insert(target, t1, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},

		p: function update(changed, ctx) {
			if (!button_slot) {
				if (!current || changed.buttonName) {
					set_data(t0, ctx.buttonName);
				}

				if ((!current || changed.buttonColor) && button_class_value !== (button_class_value = "" + ctx.buttonColor + " hover:" + ctx.buttonHover() + " text-white font-bold py-2 px-4\r\n    rounded")) {
					attr(button, "class", button_class_value);
				}
			}

			if (button_slot && button_slot.p && changed.$$scope) {
				button_slot.p(get_slot_changes(button_slot_1, ctx, changed, get_button_slot_changes), get_slot_context(button_slot_1, ctx, get_button_slot_context));
			}

			if (ctx.showModal) {
				if (if_block) {
					if_block.p(changed, ctx);
					transition_in(if_block, 1);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();
				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});
				check_outros();
			}
		},

		i: function intro(local) {
			if (current) return;
			transition_in(button_slot, local);
			transition_in(if_block);
			current = true;
		},

		o: function outro(local) {
			transition_out(button_slot, local);
			transition_out(if_block);
			current = false;
		},

		d: function destroy(detaching) {
			if (!button_slot) {
				if (detaching) {
					detach(button);
				}

				dispose_button_slot();
			}

			if (button_slot) button_slot.d(detaching);

			if (detaching) {
				detach(t1);
			}

			if (if_block) if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	
  let showModal = true;
  let { buttonColor = "bg-blue-500", buttonName = "Добавить" } = $$props;

  const handleClose = _showModal => {
    $$invalidate('showModal', showModal = _showModal);
  };

  let buttonHover = () => {
    let clr = buttonColor.split("-");
    clr[2] = "700";

    return clr.join("-");
  };

	const writable_props = ['buttonColor', 'buttonName'];
	Object.keys($$props).forEach(key => {
		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Index> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;

	function click_handler() {
		const $$result = (showModal = true);
		$$invalidate('showModal', showModal);
		return $$result;
	}

	function click_handler_1() {
		const $$result = (showModal = false);
		$$invalidate('showModal', showModal);
		return $$result;
	}

	function click_handler_2() {
		const $$result = (showModal = false);
		$$invalidate('showModal', showModal);
		return $$result;
	}

	function click_handler_3() {
		return handleClose(false);
	}

	$$self.$set = $$props => {
		if ('buttonColor' in $$props) $$invalidate('buttonColor', buttonColor = $$props.buttonColor);
		if ('buttonName' in $$props) $$invalidate('buttonName', buttonName = $$props.buttonName);
		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
	};

	return {
		showModal,
		buttonColor,
		buttonName,
		handleClose,
		buttonHover,
		click_handler,
		click_handler_1,
		click_handler_2,
		click_handler_3,
		$$slots,
		$$scope
	};
}

class Index extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, ["buttonColor", "buttonName"]);
	}

	get buttonColor() {
		throw new Error("<Index>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set buttonColor(value) {
		throw new Error("<Index>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get buttonName() {
		throw new Error("<Index>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set buttonName(value) {
		throw new Error("<Index>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

var Base = {
  Modal: Index
};

/* src\App.svelte generated by Svelte v3.6.9 */

const file$1 = "src\\App.svelte";

// (32:2) <Base.Modal>
function create_default_slot(ctx) {
	var div3, div0, img, t0, div2, div1, t2, a, t4, p;

	return {
		c: function create() {
			div3 = element("div");
			div0 = element("div");
			img = element("img");
			t0 = space();
			div2 = element("div");
			div1 = element("div");
			div1.textContent = "Marketing";
			t2 = space();
			a = element("a");
			a.textContent = "Finding customers for your new business";
			t4 = space();
			p = element("p");
			p.textContent = "Getting a new business off the ground is a lot of hard work. Here are\r\n          five ideas you can use to find your first customers.";
			attr(img, "class", "rounded-lg md:w-56 ");
			attr(img, "src", "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2550&q=80");
			attr(img, "alt", "Woman paying for a purchase");
			add_location(img, file$1, 34, 8, 2240);
			attr(div0, "class", "md:flex-shrink-0");
			add_location(div0, file$1, 33, 6, 2200);
			attr(div1, "class", "uppercase tracking-wide text-sm text-indigo-600 font-bold");
			add_location(div1, file$1, 40, 8, 2546);
			attr(a, "href", "#");
			attr(a, "class", "block mt-1 text-lg leading-tight font-semibold text-gray-900\r\n          hover:underline");
			add_location(a, file$1, 43, 8, 2664);
			attr(p, "class", "mt-2 text-gray-600");
			add_location(p, file$1, 49, 8, 2869);
			attr(div2, "class", "mt-4 md:mt-0 md:ml-6");
			add_location(div2, file$1, 39, 6, 2502);
			attr(div3, "class", "md:flex");
			add_location(div3, file$1, 32, 4, 2171);
		},

		m: function mount(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div0);
			append(div0, img);
			append(div3, t0);
			append(div3, div2);
			append(div2, div1);
			append(div2, t2);
			append(div2, a);
			append(div2, t4);
			append(div2, p);
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(div3);
			}
		}
	};
}

function create_fragment$1(ctx) {
	var div, t, current;

	var base_modal = new Base.Modal({
		props: {
		$$slots: { default: [create_default_slot] },
		$$scope: { ctx }
	},
		$$inline: true
	});

	return {
		c: function create() {
			div = element("div");
			t = text("asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg asdl;gknasd;lkjghasdlk;jg\r\n  asdl;gknasd;lkjghasdlk;jg\r\n  ");
			base_modal.$$.fragment.c();
			attr(div, "class", " container mx-auto");
			add_location(div, file$1, 4, 0, 63);
		},

		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},

		m: function mount(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
			mount_component(base_modal, div, null);
			current = true;
		},

		p: function update(changed, ctx) {
			var base_modal_changes = {};
			if (changed.$$scope) base_modal_changes.$$scope = { changed, ctx };
			base_modal.$set(base_modal_changes);
		},

		i: function intro(local) {
			if (current) return;
			transition_in(base_modal.$$.fragment, local);

			current = true;
		},

		o: function outro(local) {
			transition_out(base_modal.$$.fragment, local);
			current = false;
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_component(base_modal);
		}
	};
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment$1, safe_not_equal, []);
	}
}

document.querySelector("#app").innerHTML = '';
var app = new App({
  target: document.querySelector("#app")
}); // module.hot.accept((dt) => {

export default app;
