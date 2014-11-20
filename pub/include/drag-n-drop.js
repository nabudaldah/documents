function dragenter(event){
  //console.log(document.getElementById(event.srcElement.id))
};

function dragstart(event){
  // console.log(event.srcElement.id + ' is being dragged ...');
  //$("#" + event.srcElement.id).hide();
  var data = event.target.id;
  // var data = Math.random();
  // var data = "nabi abudaldah";
  event.dataTransfer.setData("Text", data);
  console.log(event.dataTransfer.getData("Text"));
};

function drop(event){
  //$("#" + event.target.id).focus();
  event.preventDefault();
  var data = event.dataTransfer.getData("Text");
  console.log(data)
  event.target.value = data;
  console.log(event)
};