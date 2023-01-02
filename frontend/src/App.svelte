<!-- svelte-ignore a11y-missing-attribute -->
<script lang="ts">
  import QueryStream from "./eiffelvis";
  import GraphSettings  from "./layout";
  import G6Graph from "./components/G6Graph.svelte";
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

/*   $: {
    if (graph_elem) {
      // TODO: split up?
      graph_elem.resizeGraph();
      selected_node = null;
      submit_state_query();
    }
  } */


                                                               // non-interactive mode variables
  let show_message: boolean = false; 
  let dayToDisplay: string = null; 
  let dayLastEventRecieved: number = 0; 
  let recievedNewNode: boolean = false; 
  let displayTime: string = null;
  let displayDate: string = null;
  

// This should be moved to be displayed for each SuperGraph instance
const displayInfoMessage= () =>{ //After 1 minute of no nodes recieved, a message is displayed. 
  let time: Date = new Date();
  if ( time.getDate() == dayLastEventRecieved){
      dayToDisplay = "TODAY";     
  }
  else if (time.getDate() - dayLastEventRecieved == 1){   
      dayToDisplay = "YESTERDAY"; 
  }
  else if (time.getDate() - dayLastEventRecieved> 1){
      dayToDisplay = displayDate;
  }

  if (recievedNewNode==false && dayToDisplay != null  ){
    show_message = true; 
    nonInteractiveState = false;
    console.log("received no new node")
  }
  else {
    show_message = false;
  } 
}

 let ms = 60000;
 let interval= setInterval( displayInfoMessage, ms); // set timer to run every 1 minute

 // timer function to wait 1 minute to check if nodes are still being received, 
 // if no new nodes after 1 minute, message for latest node received is displayed
 const resetTimer = () =>{
  clearInterval(interval); // interval is reset every minute 
  interval= setInterval( displayInfoMessage, ms);
}

  const consume_query = async () => {
    await tick()
    current_graph.consume_query();
    /* const layout = new StatefulLayout();
    awaiting_query_request = true;
    const iter = await active_stream.iter();
    awaiting_query_request = false;
    graph_elem.reset();
    let once = true;

    for await (const event of iter) {
      layout.apply(event, graph_options);
      graph_elem.push(event);

      graph_elem.nonInteractiveMode(event,nonInteractiveState);
    
      //every time a node is pushed to the graph the variables are updated
      let timeJson: number = event.time;
      let time: Date = new Date(timeJson);
      dayLastEventRecieved = time.getDate(); 
      displayDate= time.toLocaleDateString([], {weekday: "short", day: "numeric", month: "short",year: "numeric"});
      displayTime= time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
      recievedNewNode = true;
      show_message = false; 

       
      // TODO: Find a better way to do this
      if (once) {
        graph_elem.focusNode(event.id);
        once = false;
      }

      legend = layout.getNodeStyle();
    }

    recievedNewNode = false; 
    console.log("stoped recieving nodes")
    resetTimer();// method to reset timer
    */
  };

  const submit_state_query = () => submit_query(current_query);

  const submit_query = async (fquery: FixedQuery) => {
    await tick();
    current_graph.submit_suery(fquery); 
  };

  const add_filter = () => {};

  const use_selected_as_root = async () => {
    await tick();
    current_graph.use_selected_as_root();
  };

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
    console.log("setCurrentGraph");
    current_graph = graph;
    setCurrentQhistory();
  };

  const setCurrentQhistory = async () => {
    await tick();
    current_qhistory = current_graph.getQhistory();
  };

const reset_graph_options = async () => {
  await tick();
  return current_graph.reset_graph_options()
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
  
  <div class="flex flex-col fixed z-0 items-center">
    <div
        style="white-space: nowrap;"      
              class:hidden={!show_message}
              class:show= {show_message}
              >
      <span class="text-sm text-left w-full h-full">LATEST EVENTS RECEIVED - {dayToDisplay} AT {displayTime}</span> 
    </div>  
    <div >
     <!-- Used for testing, will be updated to add dynamically -->
      <Splitpanes theme="my-theme" style="height: 100%">
        <Pane>
          <Splitpanes theme="my-theme" horizontal="{true}" >
            <Pane > 
               <SuperGraph
                  on:selected_node_change={setSelectedNode}
                  on:set_graph_element={setGraphElement}
                  on:pane_clicked={() => {setGraphElement; setCurrentGraph(graph_one)} }
                  bind:this={graph_one}
                  /> 
            </Pane>
            <Pane >
                <SuperGraph
                  on:selected_node_change={setSelectedNode}
                  on:pane_clicked={() => {setGraphElement; setCurrentGraph(graph_two)} }
                  bind:this={graph_two}
                  />
            </Pane>
          </Splitpanes>
        </Pane>
      </Splitpanes>
    </div>   
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