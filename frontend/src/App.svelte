<!-- svelte-ignore a11y-missing-attribute -->
<script lang="ts">
  import type {QueryStream} from "./eiffelvis";
  import type {GraphSettings}  from "./layout";
  import type G6Graph from "./components/G6Graph.svelte";
  import SideBar from "./components/SideBar.svelte";
  import Panel from "./components/Panel.svelte";
  import { FullEvent, query_eq } from "./apidefinition";
  import config from "./config.json";
  import {
    empty_fixed_event_filters,
    FixedQuery,
    fixed_query_to_norm,
  } from "./uitypes";
  import Settings from "./components/settings/Settings.svelte";
  import { Pane, Splitpanes } from "svelte-splitpanes";
  import SuperGraph from "./components/SuperGraph.svelte";
  import { tick } from "svelte";
  import SvgButton from "./components/SvgButton.svelte";
  import G6 from "@antv/g6";

  let current_graph: SuperGraph = null;
  let graph_one: SuperGraph = null;
  let graph_two: SuperGraph = null;

  let graph_elem: G6Graph = null;
  let active_stream: QueryStream = null;
  let awaiting_query_request: boolean = false;

  let selected_node: FullEvent = null;

  let show_settings: boolean = false;
  let show_legend: boolean = true;
  let show_timebar: boolean = false;
  let show_filter_panel: boolean = false; 
  $: nonInteractiveState = true


  let customTheme: Object = config.Theme.ColorBlind;
  let themeMap: Map<string, any> = new Map(Object.entries(customTheme));
  let legend: Map<string, any> = themeMap;
  $: styles = [...legend.entries()];

  //let query_cache: { stream: QueryStream; query: FixedQuery }[] = [];

  let current_qhistory: FixedQuery[] = [];

  let current_query: FixedQuery = {
    range_filter: { begin: { type: "Absolute", val: -500 }, end: null },
    event_filters: [empty_fixed_event_filters()],
    collection: { type: "Forward" },
  };

  // This needs to be changed to update the qhistory of the current graph
   $: current_query_changed =
    current_qhistory.length > 0 &&
    !query_eq(
      fixed_query_to_norm(current_query),
      fixed_query_to_norm(current_qhistory[current_qhistory.length - 1])
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



  let submit_state_query = () => submit_query(current_query);
  let submit_query: (fquery: FixedQuery) => Promise<void>;
  let consume_query: () => Promise<void>;

  const add_filter = () => {};

  const toggleMenu = () => {
    show_settings = !show_settings;
  };

  const toggleLegend = () => {
    show_legend = !show_legend;
  };

  const toggleFilterPanel = () => {
    show_filter_panel = !show_filter_panel;
  };
  

  //Updates the timebar each time the show timebar button is clicked
  const updateTimebar = () =>{  
            (show_timebar = !show_timebar),
            graph_elem.updateTimeBar(show_timebar)
  };

  const toggleInteractiveMode = () =>{  
            (nonInteractiveState = !nonInteractiveState)
  };

 const  handle_close_request = () => {
    console.log('received in app')
    show_settings = !show_settings
 }


  // Sets the selected node (Doesn't know what graph it's from)
  const setSelectedNode = (e: any) => {
    selected_node = e.detail;
  };

  // Sets the initial graph element 
  const setGraphElement = (e: any) => {
    if(e.detail != graph_elem){
      graph_elem = e.detail;
    }
  };
  
  const setCurrentGraph = (graph: any) =>{
    current_graph = graph;
   
  };

let reset_graph_options: () => void;
let use_selected_as_root: () => void;
let Options: any;
let splitView = true; 
let newGraph: SuperGraph; 
  $:panesNumber = 1;
  $:newGraph; 
 
    $: addNewGraph = () => {
        if (panesNumber >= 0) panesNumber++;
         newGraph = new SuperGraph(Options); 
      }

    $: removeNewGraph = () => {
        if (panesNumber >= 0) panesNumber--;
      }

</script>

<div class="flex w-screen h-screen relative bg-base-100"> 
  <!-- SideBar component: the variables are updated inside App.svelte -->
  <div class="z-20">
    <SideBar 
      show_timebar= {show_timebar}
      show_legend = {show_legend}
      show_settings = {show_settings} 
      interactiveMode = {nonInteractiveState}
      show_filter_panel = {show_filter_panel}
      toggleSettingsPlaceholder = {toggleMenu} 
      toggleLegendPlaceholder = {toggleLegend} 
      toggleFilterPanelPlaceholder = {toggleFilterPanel}
      updateTimeBarPlaceholder = {updateTimebar}
      toggleInteractiveModePlaceholder = {toggleInteractiveMode}

    />
  </div>
  <div class="flex z-10 pointer-events-none"
      >   <!-- panels  -->
      <Panel 
        show_filter_panel = {show_filter_panel}
        show_legend_placeholder = {show_legend} 
        use_selected_as_root = {use_selected_as_root}
        current_query = {current_query}
        current_query_changed= {current_query_changed}
        add_filter = {add_filter}
        qhistory = {current_qhistory}
        awaiting_query_request = {awaiting_query_request}
        submit_state_query_placeholder = {submit_state_query}
        selected_node = {selected_node}
        styles = {styles}
      />
    </div>
    <div>
      <SvgButton
        onClickAction= {addNewGraph}
        btnState= {splitView}
        data = "M3 3h18v18H3zM12 8v8m-4-4h8"
      />
    <button
      disabled={panesNumber <= 0}
      on:click= {removeNewGraph}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" 
        viewBox="0 0 24 24" fill="none" 
        stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 3h18v18H3zM8 12h8"/></svg>
    </button>

      <Splitpanes theme="my-theme" style="height: {100/panesNumber}%">
        <Pane>
          <Splitpanes theme="my-theme" horizontal="{true}">
            {#each { length: panesNumber } as _, i}
              <Pane class="pane" minSize={1}>
                <svelte:component this = {SuperGraph}
                  on:selected_node_change={setSelectedNode}
                  on:pane_clicked={() => {setGraphElement; setCurrentGraph(graph_two)} }
                  on:set_graph_element={setGraphElement}
                  on:pane_clicked={setGraphElement}
                  options={Options}
                  bind:this={newGraph}
                  bind:consume_query = {consume_query}
                  bind:qhistory= {current_qhistory}
                  bind:reset_graph_options= {reset_graph_options}
                  bind:use_selected_as_root = {use_selected_as_root}
                  bind:submit_query = {submit_query}
                 
                  />
              </Pane>
            {/each}
          </Splitpanes>
        </Pane>
      </Splitpanes>
  </div>
  
  <div class="flex flex-wrap content-center justify-center z-30 absolute w-screen h-screen pointer-events-none rounded-lg">
    <div class="pointer-events-auto rounded-lg w-3/6 max-w-screen-sm min-w-min h-2/6 relative overflow-y-auto"
      class:hidden={!show_settings}>
      <Settings 
      on:close_request={() => {show_settings = !show_settings}}
      consume_query = {consume_query}
      reset_graph_options_placeholder = {reset_graph_options}
      graph_options = {graph_options}
      />
    </div>
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


  .splitpanes.my-theme {
  .splitpanes__pane {
      background-color: #fffff;
  }
  .{
    border-color: aliceblue;
    border-radius: 2em;
  }
  .splitpanes__splitter {
      background-color: rgb(0, 0, 0);
      position: relative;
      &:before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          transition: opacity 0.4s;
          background-color: rgba(0, 0, 0, 0.2);
          opacity: 0;
          z-index: 1;
      }
      &:hover:before {
          opacity: 1;
      }
      &.splitpanes__splitter__active {
          z-index: 2; /* Fix an issue of overlap fighting with a near hovered splitter */
      }
  }
}
.my-theme {
  &.splitpanes--vertical > .splitpanes__splitter:before {
      left: -30px;
      right: -30px;
      height: 100%;
      cursor: col-resize;
  }
  &.splitpanes--horizontal > .splitpanes__splitter:before {
      top: -10px;
      bottom: -10px;
      width: 100%;
      cursor: row-resize;
  }
}

</style>