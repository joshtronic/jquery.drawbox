/**
 * jQuery DrawBox Plug-In 1.0
 *
 * http://github.com/crowdsavings/drawbox
 * http://plugins.jquery.com/project/drawbox
 *
 * Author: Josh Sherman <josh@crowdsavings.com>
 * Copyright (c) 2010 CrowdSavings.com, LLC
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

(function($)
{
	$.fn.extend(
	{
		drawbox: function(options)
		{
			// Default options
			var defaults = {
				// Canvas properties
				lineWidth:     1.0,
				lineCap:       'butt',
				lineJoin:      'miter',
				miterLimit:    10,
				strokeStyle:   'black',
				fillStyle:     'none',
				shadowOffsetX: 0.0,
				shadowOffsetY: 0.0,
				shadowBlur:    0.0,
				shadowColor:   'none',
				// Color selector options
				colorSelector: false,
				colors:        [ 'black', 'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet' ],
				// Clearing options
				showClear:     true,
				clearLabel:    'Clear Canvas',
				clearStyle:    'button' // or 'link'
			}

			options = $.extend(defaults, options);

			return this.each(function()
			{
				// The IE check is because explorercanvas swaps out the canvas element
				if (this.nodeName == 'CANVAS' || navigator.userAgent.indexOf('MSIE') != -1)
				{
					$(this).css('cursor',   'pointer');
					$(this).attr('onclick', 'function onclick(event) { void 1; }');

					if (this.getContext)
					{
						var canvas  = this;
						var context = this.getContext('2d');
						var id      = $(this).attr('id');

						$(this).after('<div id="' + id + '-controls" style="width:' + $(this).width() + 'px"></div>');

						context.underInteractionEnabled = true;

						// Overrides with passed options
						context.lineWidth     = options.lineWidth;
						context.lineCap       = options.lineCap;
						context.lineJoin      = options.lineJoin;
						context.miterLimit    = options.miterLimit;
						context.strokeStyle   = options.strokeStyle;
						context.fillStyle     = options.fillStyle;
						context.shadowOffsetX = options.shadowOffsetX;
						context.shadowOffsetY = options.shadowOffsetY;
						context.shadowBlur    = options.shadowBlur;
						context.shadowColor   = options.shadowColor;

						// Adds the color selector
						if (options.colorSelector == true)
						{
							var color_selector = '';

							for (i in options.colors)
							{
								var color = options.colors[i];

								if (i == 0)
								{
									context.strokeStyle = color
								}

								color_selector = color_selector + '<div style="height:16px;width:16px;background-color:' + color + ';margin:2px;float:left;border:2px solid ' + (i == 0 ? '#000' : 'transparent') + '"' + (i == 0 ? ' class="selected"' : '') + '></div>';
							}
								
							$('#' + id + '-controls').append('<div style="float:left" id="' + id + '-colors">' + color_selector + '</div>');
						}
					
						// Adds the clear button / link
						if (options.showClear == true)
						{
							var clear_tag = (options.clearStyle == 'link' ? 'div' : 'button');

							$('#' + id + '-controls').append('<' + clear_tag + ' id="' + id + '-clear" style="float:right">' + options.clearLabel + '</' + clear_tag + '><br style="clear:both" />');

							clear = true;
						}

						var data_input = id + '-data';
						$(this).after('<input type="hidden" id="' + data_input + '" name="' + data_input + '" />');

						// Defines all our tracking variables
						var drawing    = false;
						var height     = $('#' + id).height();
						var width      = $('#' + id).width();
						var svg_path   = '';
						var scrollLeft = 0;
						var scrollTop  = 0;
						var inside     = false
						var prevX      = false;
						var prevY      = false;
						var x          = false;
						var y          = false;

						// Mouse events
						$(document).mousedown(function(e) { drawingStart(e); });
						$(document).mousemove(function(e) { drawingMove(e);  });
						$(document).mouseup(  function()  { drawingStop();   });

						// Touch events
						$(document).bind('touchstart',  function(e) { drawingStart(e); });
						$(document).bind('touchmove',   function(e) { drawingMove(e);  });
						$(document).bind('touchend',    function()  { drawingStop();   });
						$(document).bind('touchcancel', function()  { drawingStop();   });
							
						// Changing colors
						$('#' + id + '-colors div').click(function(e)
						{
							$('#' + id + '-controls div').css('borderColor', 'transparent').removeClass('selected');
							$(this).addClass('selected');
							$(this).css('borderColor', '#000');
						});

						// Clearing the canvas
						$('#' + id + '-clear').click(function(e)
						{
							context.save();
							context.beginPath();
							context.closePath();
							context.restore();
							context.clearRect(0, 0, $(canvas).width(), $(canvas).height());

							$('#' + data_input).val('');
						});

						function getTouch(e)
						{
							// iPhone/iPad/iPod uses event.touches and not the passed event
							if (typeof(event) != "undefined" && typeof(event.touches) != "undefined")
							{
								e = event.touches.item(0);
							
								scrollLeft = document.body.scrollLeft;
								scrollTop  = document.body.scrollTop;
							}
							else
							{
								scrollLeft = $(document).scrollLeft();
								scrollTop  = $(document).scrollTop();
							}
							
							// Tracks last position to handle dots (as opposed to lines)
							if (x != false)
							{
								prevX = x;
								prevY = y;
							}

							// Calculates the X and Y values
							x = e.pageX - $(canvas).position().left;
							y = e.pageY - $(canvas).position().top;
							return e;
						}

						function draw(type)
						{
							if (type != 'stop')
							{
								if (type == 'start')
								{
									inside = false;
									prevX  = false;
									prevY  = false;

									context.beginPath();
									context.moveTo(x, y);
								
									svg_path = '<polyline points="';
								}
								else
								{
									// If there's no previous increment since it's a .
									if (prevX == false)
									{
										x = x + 1;
										y = y + 1;
									}

									context.lineTo(x, y);
								}
								
								context.stroke();

								if (svg_path.length > 0 && svg_path.substring(svg_path.length - 1) != '"')
								{
									svg_path = svg_path + ' ';
								}
								
								svg_path = svg_path + x + ',' + y;
						
								height = $('#' + id).height();
								width  = $('#' + id).width();

								if ((x > 0 && x <= width) && (y > 0 && y <= height))
								{
									inside = true;
								}
							}
							else
							{
								draw('move');

								if (inside == true)
								{
									// Closes the polyline (with style info) and adds the closing svg tag
									svg_path = svg_path + '" style="fill:' + options.fillStyle + ';stroke:' + context.strokeStyle + ';stroke-width:' + context.lineWidth + '" /></svg>';

									var element  = $('#' + data_input);
									var svg_data = element.val();

									// Adds the opening and closing SVG tags
									if (svg_data == '')
									{
										svg_data = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg width="' + width + '" height="' + height + '" version="1.1" xmlns="http://www.w3.org/2000/svg"></svg>';
									}
									
									// Appends the recorded path
									element.val(svg_data.substring(0, svg_data.length - 6) + svg_path);
								}
							}
						}

						function drawingStart(e)
						{
							// Prevent the default action (scrolling) from occurring
							if (inside == true)
							{
								e.preventDefault();
							}

							drawing = true;

							e = getTouch(e);

							context.strokeStyle = $('#' + id + '-colors div.selected').css('backgroundColor');

							draw('start');
						}
							
						function drawingMove(e)
						{
							// Prevent the default action (scrolling) from occurring
							if (inside == true)
							{
								e.preventDefault();
							}
						
							if (drawing == true)
							{
								e = getTouch(e);

								draw('move');
							}

							return false;
						}

						function drawingStop()
						{
							drawing = false;

							// Draws one last line so we can draw dots (e.g. i)
							draw('stop');
						}
					}
					else
					{
						alert('Your browser does not support <canvas>');
					}
				}
				else
				{
					alert('.drawbox() only works on <canvas> elements');					
				}
			});
		}
	});
})(jQuery);
