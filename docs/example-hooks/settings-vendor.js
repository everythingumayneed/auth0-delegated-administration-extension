/*
 * This sample hook will show how you can customize the dashboard for every vendor using the dashboard.
 * You can inject a custom title, a custom CSS, ... for every vendor.
 */
function(ctx, callback) {
  var vendor = ctx.request.user.app_metadata && ctx.request.user.app_metadata.vendor;

  return callback(null, {
    dict: {
      title: vendor ? vendor + ' User Management' : 'User Management Dashboard',
      memberships: 'Vendors'
    },
    css: vendor && 'https://cdn.mycompany.com/styles/' + vendor + '.css'
  });
}
