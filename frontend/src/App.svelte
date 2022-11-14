<!-- svelte-ignore a11y-missing-attribute -->
<script lang="ts">
  import G6 from "@antv/g6";
  import { QueryStream, EiffelVisConnection } from "./eiffelvis";
  import { GraphSettings, StatefulLayout } from "./layout";
  import QueryForm from "./components/QueryForm.svelte";
  import EventDetail from "./components/EventDetail.svelte";
  import GraphOptions from "./components/GraphOptions.svelte";
  import ColorLegend from "./components/ColorLegend.svelte";
  // import {timebar} from "../public/images/timebar.svg";

  import { query_eq } from "./apidefinition";
  import {
    empty_fixed_event_filters,
    FixedQuery,
    fixed_query_to_norm,
  } from "./uitypes";
  import { deep_copy } from "./utils";
  import G6Graph from "./components/G6Graph.svelte";
  import config from "./config.json";

  let graph_elem: G6Graph | null;

  export let connection: EiffelVisConnection;

  let active_stream: QueryStream | null = null;
  let awaiting_query_request = false;

  let selected_node = null;

  let show_menu = false;
  let show_legend = true;
  let show_timebar = false;
  let show_filter = false;

  let customTheme = config.Theme.ColorBlind;
  let themeMap = new Map(Object.entries(customTheme));
  let legend = themeMap;
  $: styles = [...legend.entries()];

  let query_cache: { stream: QueryStream; query: FixedQuery }[] = [];

  let qhistory: FixedQuery[] = [];

  let current_query: FixedQuery = {
    range_filter: { begin: { type: "Absolute", val: -500 }, end: null },
    event_filters: [empty_fixed_event_filters()],
    collection: { type: "Forward" },
  };

  $: current_query_changed =
    qhistory.length > 0 &&
    !query_eq(
      fixed_query_to_norm(current_query),
      fixed_query_to_norm(qhistory[qhistory.length - 1])
    );

  let graph_options: GraphSettings = {
    offset: 0,
    time_diff: 1000,
    y_scale: 0.99,
    x_sep: 60,
    y_sep: 60,
    hue: 360,
  };

  $: {
    if (graph_elem) {
      // TODO: split up?
      graph_elem.resizeGraph();
      selected_node = null;
      submit_state_query();
    }
  }

  const consume_query = async () => {
    const layout = new StatefulLayout();
    awaiting_query_request = true;
    const iter = await active_stream.iter();
    awaiting_query_request = false;
    graph_elem.reset();
    let once = true;

    for await (const event of iter) {
      layout.apply(event, graph_options);
      graph_elem.push(event);

      // TODO: Find a better way to do this
      if (once) {
        graph_elem.focusNode(event.id);
        once = false;
      }

      legend = layout.getNodeStyle();
    }
  };

  const submit_state_query = () => submit_query(current_query);

  const submit_query = (fquery: FixedQuery) => {
    const new_query = fixed_query_to_norm(fquery);
    active_stream = (() => {
      const cached = query_cache.find((v) =>
        query_eq(new_query, fixed_query_to_norm(v.query))
      );
      if (cached) {
        return cached.stream;
      } else {
        const ret = new QueryStream(connection, deep_copy(new_query));
        query_cache = [
          ...query_cache,
          { stream: ret, query: deep_copy(fquery) },
        ];
        return ret;
      }
    })();

    consume_query();
    qhistory = [...qhistory, deep_copy(fquery)];
    show_timebar = false;
    graph_elem.updateTimeBar(show_timebar);
  };

  const add_filter = () => {};

  // TODO: add loading for this
  const on_node_selected = async (e: any) => {
    if (e.detail?.target) {
      selected_node = await connection.fetch_node(
        e.detail.target._cfg.model.id
      );
    } else {
      selected_node = null;
    }
  };

  const use_selected_as_root = () => {
    current_query.collection = { type: "AsRoots" };
    current_query.range_filter = { begin: null, end: null };

    const filters = empty_fixed_event_filters();
    filters.ids.pred.ids = [selected_node.meta.id];
    current_query.event_filters = [filters];

    submit_state_query();
  };

  const reset_graph_options = () => {
    graph_options = {
      offset: 0,
      time_diff: 1000,
      y_scale: 0.99,
      x_sep: 60,
      y_sep: 60,
      hue: 360,
    };
    consume_query();
  };

  const toggleMenu = () => {
    // if (show_legend) {
    //   toggleLegend();
    // }
    show_menu = !show_menu;
  };

  const toggleLegend = () => {
    // if (show_menu) {
    //   toggleMenu();
    // }
    show_legend = !show_legend;
  };

  const options = {
    width: 400,
    height: 400,
    workerEnabled: false,
    fitView: true,
    defaultEdge: {
      style: {
        endArrow: { path: G6.Arrow.triangle(5, 10, 0), d: 0 },
      },
    },
    nodeStateStyles: {
      selected: {
        fill: "#ffffff",
        lineWidth: 0.4,
      },
    },
    modes: {
      default: [
        "click-select",
        "drag-canvas",
        {
          type: "zoom-canvas",
          enableOptimize: true,
        },
      ],
    },
  };
</script>

<div class="flex m-0 h-screen w-screen bg-base-300">
  <div class="flex h-screen"> <!-- the div for the side buttons  -->
    <ul class="menu grid justify-items-center content-end w-14 py-3  h-screen shadow-sm bg-base-1 rounded-box">
      <li class="bg-primary">
        <a
          class:btn-active={show_timebar}
          alt="Timebar icon"
          on:click={() => (
            (show_timebar = !show_timebar),
            graph_elem.updateTimeBar(show_timebar)
          )}
        >
        <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        fill="white"
        class="inline-block w-6 h-6 stroke-current"
        >! Font Awesome Free 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc.<path
          d="M232 120C232 106.7 242.7 96 256 96C269.3 96 280 106.7 280 120V243.2L365.3 300C376.3 307.4 379.3 322.3 371.1 333.3C364.6 344.3 349.7 347.3 338.7 339.1L242.7 275.1C236 271.5 232 264 232 255.1L232 120zM256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256C0 114.6 114.6 0 256 0zM48 256C48 370.9 141.1 464 256 464C370.9 464 464 370.9 464 256C464 141.1 370.9 48 256 48C141.1 48 48 141.1 48 256z"
        /></svg>
        </a>
      </li>
      <li class="bg-primary">
        <a class="" class:btn-active={show_legend} on:click={toggleLegend} alt="Legend icon">
          <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 576 512"
          fill="white"
          class="inline-block w-6 h-6 stroke-current"
          ><!--! Font Awesome Free 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --><path
            d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM432 256c0 79.5-64.5 144-144 144s-144-64.5-144-144s64.5-144 144-144s144 64.5 144 144zM288 192c0 35.3-28.7 64-64 64c-11.5 0-22.3-3-31.6-8.4c-.2 2.8-.4 5.5-.4 8.4c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-2.8 0-5.6 .1-8.4 .4c5.3 9.3 8.4 20.1 8.4 31.6z"
          /></svg>
        </a>
      </li>
      <li class="bg-primary">
        <a class="" class:btn-active={show_menu} on:click={toggleMenu} alt="Menu icon">
          <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 448 512"
          fill="white"
          class="inline-block w-6 h-6 stroke-current"
          ><!--! Font Awesome Free 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --><path
            d="M448 64c0-17.7-14.3-32-32-32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32zm0 256c0-17.7-14.3-32-32-32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H416c17.7 0 32-14.3 32-32zM0 192c0 17.7 14.3 32 32 32H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32zM448 448c0-17.7-14.3-32-32-32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H416c17.7 0 32-14.3 32-32z"
          /></svg
        >
        </a>
      </li>
    </ul>
  </div>
  <div
    class="left-14 bottom-0 fixed align-bottom justify-bottom items-end"
    style="z-index:1"
  >   <!-- the div for the panels  -->
    <div class="fixed w-80 left-14 bottom-0" style="z-index:1">
      <ul class="menu menu-compact">
        <li>
          <div
            class="overflow-x-auto overflow-y-auto bg-base-100 w-0 h-fit shadow-lg rounded-box mb-0"
            class:show={show_legend}
          >
            <ColorLegend {styles} />
          </div>
        </li>
        <li>
          <div
            class="overflow-x-auto overflow-y-auto bg-base-100 h-fit shadow-lg rounded-box mb-0 pb-2"
            class:hidden={!show_menu}
          >
            <GraphOptions
              bind:graph_options
              on:reset={reset_graph_options}
              on:apply={consume_query}
            />
          </div>
        </li>
        <li>
          <div
            class="p-3 shadow-lg bg-base-100 rounded-box h-fit fixed w-fit m-0"
          >
            <div
              class="container h-full w-full p-1 overflow-hidden scroll-auto"
            >
              <div
                class:hidden={!selected_node}
                class="rounded-box bg-accent p-3 mb-2"
              >
                <EventDetail
                  {selected_node}
                  on:useroot={use_selected_as_root}
                />
              </div>
              <h1 class="text-lg py-2">Filter Options:</h1>
              <QueryForm bind:query={current_query} />
              <div class="btn-group w-full flex flex-row mt-2">
                <button
                  class="btn btn-sm btn-primary basis-1/3"
                  on:click={add_filter}
                >
                  + new filter</button
                >
                <button
                  class="btn btn-sm btn-primary basis-1/3"
                  disabled={qhistory.length <= 1 || awaiting_query_request}
                  on:click={() => {
                    qhistory.pop();
                    current_query = qhistory.pop();
                    qhistory = [...qhistory];
                    submit_state_query();
                  }}
                  >{qhistory.length - 1 > 0
                    ? "undo " + (qhistory.length - 1)
                    : ":)"}</button
                >
                <button
                  class="btn btn-sm btn-primary basis-1/3"
                  class:loading={awaiting_query_request}
                  disabled={awaiting_query_request || !current_query_changed}
                  on:click={submit_state_query}>submit</button
                >
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div><!-- the div for the panels  -->
    <G6Graph
    on:nodeselected={on_node_selected}
    bind:this={graph_elem}
    {options}
    data={{}}
  />
  </div>
</div>

<style lang="postcss" global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  .show {
    width: 320px;
  }
  .move {
    margin-right: 350px;
  }
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  input[type="number"] {
    -moz-appearance: textfield;
  }
</style>
