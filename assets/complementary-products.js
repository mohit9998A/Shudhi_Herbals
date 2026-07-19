let selected_Variants = [];
const mainPro_VariantId = $('#productSelect').val();
console.log(mainPro_VariantId);
updateCount(1);
toggleAddtoCart();
$(document).on('change', 'select[name="quantity"]', function() {
   const mainPro_Quantity = $(this).val();
  updateCount(parseInt(mainPro_Quantity) + selected_Variants.length);
});
$(document).on('change', 'input[name="bundle_pair"]', function () {
    const var_Id = $(this).val();

    if ($(this).is(':checked')) {
        selected_Variants.push(var_Id);
    } else {
        selected_Variants = selected_Variants.filter(id => id !== var_Id);
    }

  updateCount(parseInt($('select[name="quantity"]').val()) + selected_Variants.length);
  toggleAddtoCart();
});

function updateCount(count) {
    $('.count_product').text(count);
}
function toggleAddtoCart(){
  if(selected_Variants.length >0){
    $('.add_to_cartt').show();
  }else{
   $('.add_to_cartt').hide(); 
  }
}
// $(document).on('click', '.add_to_cartt', function (e) {
//     e.preventDefault();
//     const mainPro_Quantity = $('select[name="quantity"]').val();
//   //alert(mainPro_Quantity)
//     const items = [{ id: mainPro_VariantId, quantity: mainPro_Quantity }];
//     selected_Variants.forEach(var_Id => {
//         items.push({ id: var_Id, quantity: 1 });
//     });
  
//     $.ajax({
//         url: '/cart/add.js',
//         method: 'POST',
//         contentType: 'application/json',
//         data: JSON.stringify({ items: items }),
//         success: function(cartItem){
          
//           var cart_type = $('#cart_type').val();
//           if(cart_type == 'drawer'){
//             jQuery.getJSON('/cart.js', function(cart) {
//                   $(".cart-count-bubble span").html(cart.item_count);                   
//                 });
//             setTimeout(() => {
//             $(document).on("click", "#CartDrawer-Overlay", function () {
//                   $(".drawer__close").click();
//              });
//               }, 800); 
            
//             $('cart-drawer').load(window.location.href + ' #CartDrawer');
//             $('cart-drawer').removeClass('is-empty');
//             $('cart-drawer').addClass('active');
//           }else if(cart_type == 'page'){
//             window.location.href = '/cart';
//           }else if(cart_type == 'notification'){
//             jQuery.getJSON('/cart.js', function(cart) {
//                   $(".cart-count-bubble span").html(cart.item_count);                   
//                 });
//            const cartNotification = document.querySelector('cart-notification');
//              if (cartNotification) {
//               $('#cart-notification').addClass('active');
  
//               cartNotification.open();
//               } else {
//                 console.error('CartNotification element not found.');
//               }
//           }
            
//         },
//         error: function (error) {
//             console.error('Error adding items to cart:', error);
//         }
//     });
// });
$(document).on('click', '.add_to_cartt', function (e) {
    e.preventDefault();
    const mainPro_Quantity = $('select[name="quantity"]').val();
    
    // Get Main Product Variant ID
    const mainPro_VariantId =  $('#productSelect').val();

    // Get personalization inputs
    const personaliseFragg = $('#personalise_fragg').val()?.trim();
    const personaliseFraggIdd = $('#personalise_fragg_id').val()?.trim();
    const warranty_val = $('#warranty_value').val()?.trim() || '';
    const personaliseName = $('#personalise_name').val()?.trim();
    const printColor = $('#print_color').val()?.trim();
    const personaliseId = $('.save_btnn').attr('pro_id');

    // Initialize items array
    const items = [];

    // Add Main Product with properties
    let mainItem = {
        id: Number(mainPro_VariantId),
        quantity: Number(mainPro_Quantity),
        properties: {}
    };

    if (personaliseFragg) mainItem.properties["Fragrance"] = personaliseFragg;
    if (warranty_val) mainItem.properties["Warranty Type"] = warranty_val;
    if (personaliseName) mainItem.properties["Personalized Name"] = personaliseName;
    if (printColor) mainItem.properties["Personalized Color"] = printColor;

    // Push Main Product to items array
    items.push(mainItem);

    // Add bundled variants
    selected_Variants.forEach(var_Id => {
        items.push({ id: var_Id, quantity: 1 });
    });

    // Add Fragrance Product (if available)
    if (personaliseFraggIdd) {
        items.push({ id: Number(personaliseFraggIdd), quantity: 1, properties: {} });
    }

    // Add Personalized Product (if available)
    if (personaliseId) {
        let personalItem = {
            id: Number(personaliseId),
            quantity: 1,
            properties: {}
        };
        if (personaliseName) personalItem.properties["Personalized Name"] = personaliseName;
        if (printColor) personalItem.properties["Personalized Color"] = printColor;
        items.push(personalItem);
    }

    console.log("Final items array:", JSON.stringify(items));

    // AJAX Call to Add to Cart
    $.ajax({
        url: '/cart/add.js',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ items: items }),
        success: function(cartItem) {
            var cart_type = $('#cart_type').val();

                window.location.href = '/cart';
           
        },
        error: function(error) {
            console.error('Error adding items to cart:', error);
        }
    });
});
