<script>
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  let showModal = true;
  export let buttonColor = "bg-blue-500";
  export let buttonName = "Добавить";

  const handleClose = _showModal => {
    showModal = _showModal;
  };

  let buttonHover = () => {
    let clr = buttonColor.split("-");
    clr[2] = "700";

    return clr.join("-");
  };
</script>


<slot name="button">
  <button class="{buttonColor} hover:{buttonHover()} text-white font-bold py-2 px-4
    rounded" on:click={()=> (showModal = true)}>
    {buttonName}
  </button>
</slot>

{#if showModal}
  <div transition:fade={{ duration: 250 }} class="fixed top-0 left-0 w-full h-full bg-gray-100" on:click={() => (showModal = false)} />
    <div on:click={() => handleClose(false)} class="flex fixed flex-col justify-center items-center  inset-0">
    <div transition:fade={{ duration: 250 }} class="flex flex-col  max-w-2xl  bg-white justify-center items-end">
    <button class="self-end  text-xs  pr-1 " on:click={() => (showModal = false)}>
      X

    </button>    
    <span class="w-full h-1 bg-gray-100  shadow "></span>
    <div class="p-4 pb-0">
    <slot  handle={handleClose} />
    </div>
    <hr>
  </div>
  </div>
{/if}