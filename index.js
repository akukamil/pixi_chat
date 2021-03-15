var PI_2=6.283185307, M_WIDTH=800, M_HEIGHT=450;
var app, game_res, objects={}; 

const chat_size=25;
var chat;

var game_objects=[];

class grid_placer_class
{	
	constructor(x,y,width,num_of_columns)
	{
		this.x=x+20;
		this.y=y+20;
		this.width=width-40;
		this.num_of_columns=num_of_columns;
		this.min_col=0;
		this.columns_bottom=[];
		this.column_width=this.width/this.num_of_columns;
		for (var i=0;i<this.num_of_columns;i++)
			this.columns_bottom[i]=this.y;
		
	}

	get_new_placement(w,h)
	{
		
		var ratio = this.column_width/w;		
		var calc_width=w*ratio;
		var calc_height=h*ratio;
		
		
		//определяем самую короткую колонку
		this.min_col = 0;
		for (var i = 1; i < this.num_of_columns; i++)
			if (this.columns_bottom[i] < this.columns_bottom[this.min_col]) this.min_col = i;
		
		var res_bottom=this.columns_bottom[this.min_col];
		this.columns_bottom[this.min_col]+=calc_height;
		return [this.x+this.column_width*this.min_col,res_bottom,calc_width,calc_height]	
	}
	
}

class chat_class
{
	constructor(left=20, top=20, width=200, height=400, input_height=30)
	{		
		//тик для контроля времени
		this.tick=0;
		
		//для контроля перемещения чата
		this.prv_mouse_x=0;
		this.prv_mouse_y=0;
		this.bcg_down=false;
		
		//указатель на чатом
		this.hover_over_chat=false;
		
		
		//контроль размеров чата
		this.cor_down=false;
		
		//режим просмотра истории чата
		this.browsing_mode=false;

		//индексы самого старого и самого нового сообщения
		this.old_msg_index=-1;
		this.new_msg_index=-1;
		
		//указатель о необходимости сжатия стека сообщений
		this.need_collapse=false;

		//это контейнер и сообщения
		this.stack_container=new PIXI.Container();
		this.messages=[];
		for (var i=0;i<chat_size;i++)
		{			
			var message={};
			
			message.objects={};
			
			//основной фон сообщения или картинка
			message.objects.bcg=new PIXI.AnimatedSprite([game_res.resources["message_bcg"].texture]);
			message.objects.bcg.stop();
			message.objects.bcg.visible=false;
			
			//фон никнейма
			message.objects.nickname_bcg=new PIXI.Sprite(game_res.resources["nickname_bcg"].texture);
			message.objects.nickname_bcg.visible=false;
			
			//текст никнейма
			message.objects.nickname_text=new PIXI.BitmapText('-', {font: '25px Century Gothic', align: 'left'}); 
			message.objects.nickname_text.visible=false;
			
			//тест сообщения
			message.objects.b_text=new PIXI.BitmapText('', {font: '25px Century Gothic', align: 'left'}); 
			message.objects.b_text.visible=false;
						
			//кнопка удаления сообщения
			message.objects.delete_button=new PIXI.Sprite(game_res.resources["delete_button"].texture);
			message.objects.delete_button.anchor.set(0,0.5);
			message.objects.delete_button.visible=false;				
			message.objects.delete_button.interactive=true;
			message.objects.delete_button.buttonMode=true;
			message.objects.delete_button.pointerdown=this.delete_message.bind(this,i);
						
			message.obj_id=-1;
			message.timestamp=0;
			message.key=0;
			message.sender="";
			message.prv_msg_index=-1;
			message.next_msg_index=-1;
			message.container=new PIXI.Container();
			message.container.addChild(message.objects.nickname_bcg,message.objects.nickname_text,message.objects.bcg,message.objects.b_text,message.objects.delete_button);
			this.stack_container.addChild(message.container);
			this.messages.push(message);
		}
		
		
		//это основные элементы чата
		this.static_objects={};
		
		//это уголок для редактирования размеров чата
		this.static_objects.resize_corner=new PIXI.Sprite(game_res.resources["resize_corner"].texture);		
		this.static_objects.resize_corner.anchor.set(1,1);
		this.static_objects.resize_corner.interactive=true;
		this.static_objects.resize_corner.pointerdown=this.corner_down.bind(this);
		this.static_objects.resize_corner.pointerup=this.corner_up.bind(this);
		this.static_objects.resize_corner.pointerover=this.corner_over.bind(this);
		this.static_objects.resize_corner.pointerout=this.corner_out.bind(this);				
		app.stage.addChild(this.static_objects.resize_corner);
		
		//это основной фон чата
		this.static_objects.chat_bcg=new PIXI.Sprite(game_res.resources["chat_bcg"].texture);		
		this.static_objects.chat_bcg.interactive=true;
		this.static_objects.chat_bcg.pointerdown=this.mouse_down.bind(this);
		this.static_objects.chat_bcg.pointerup=this.mouse_up.bind(this);
		this.static_objects.chat_bcg.pointermove=this.mouse_move.bind(this);	

		
		app.stage.addChild(this.static_objects.chat_bcg);		
		
		//это маска для контейнера сообщений, чтобы они не выходили за пределы чата
		this.static_objects.mask=new PIXI.Sprite(game_res.resources["chat_mask"].texture);		
		app.stage.addChild(this.stack_container,this.static_objects.mask);
		this.stack_container.mask=this.static_objects.mask;			
		
		//это фон для поля ввода текста
		this.static_objects.input_bcg=new PIXI.Sprite(game_res.resources["input_bcg"].texture);		
		app.stage.addChild(this.static_objects.input_bcg);			
		
		//это текст который вводится
		this.static_objects.input_text=new PIXI.BitmapText('', {font: '25px Century Gothic', align: 'left'});	
		this.static_objects.input_text.anchor.set(0,1);
		this.static_objects.input_text.tint=0xFFFF00;
		app.stage.addChild(this.static_objects.input_text);	
		
		//это плейсхолдер текстового поля
		this.static_objects.input_placeholder=new PIXI.BitmapText('Сообщение...', {font: '25px Century Gothic', align: 'left'});	
		this.static_objects.input_placeholder.anchor.set(0,1);
		app.stage.addChild(this.static_objects.input_placeholder);

		//это курсор текста который вводится в текстовом поле
		this.static_objects.text_cursor=new PIXI.Sprite(game_res.resources["text_cursor"].texture);
		this.static_objects.text_cursor.anchor.set(0,1);
		app.stage.addChild(this.static_objects.text_cursor);

		//это кнопка для входа в меню
		this.static_objects.menu_button=new PIXI.Sprite(game_res.resources["menu_button"].texture);
		this.static_objects.menu_button.anchor.set(1,0);
		this.static_objects.menu_button.interactive=true;
		this.static_objects.menu_button.buttonMode=true;		
		this.static_objects.menu_button.pointerdown=this.show_menu.bind(this);
		app.stage.addChild(this.static_objects.menu_button);
		
		//это кнопка для отправки сообщения
		this.static_objects.send_button=new PIXI.Sprite(game_res.resources["send_button"].texture);
		this.static_objects.send_button.anchor.set(1,0);
		this.static_objects.send_button.interactive=true;
		this.static_objects.send_button.buttonMode=true;		
		this.static_objects.send_button.pointerdown=this.send_message.bind(this,-1);
		app.stage.addChild(this.static_objects.send_button);
		

		//это фон для меню
		this.static_objects.menu_bcg=new PIXI.Sprite(game_res.resources["menu_bcg"].texture);
		this.static_objects.menu_bcg.interactive=true;
		this.static_objects.menu_bcg.visible=false;
		app.stage.addChild(this.static_objects.menu_bcg);
				
		//это объекы в меню
		this.menu_items=[];	
		for (var i=0;i<game_objects.length;i++)
		{			
			this.menu_items[i]={sprite: new PIXI.AnimatedSprite(game_objects[i]), frame : new PIXI.Sprite(game_res.resources["item_frame"].texture)};
			if (game_objects[i].length>1)
				this.menu_items[i].sprite.play();
			this.menu_items[i].sprite.animationSpeed=0.2;
			this.menu_items[i].sprite.interactive=true;
			this.menu_items[i].sprite.buttonMode=true;		
			this.menu_items[i].sprite.pointerdown=this.send_message.bind(this,i);
			this.menu_items[i].sprite.visible=false;
			this.menu_items[i].frame.visible=false;
			app.stage.addChild(this.menu_items[i].sprite,this.menu_items[i].frame);		
		}	
		
		//располагаем все элементы чата в соответствии с заданными размерами и позициями
		this.arrange(left, top, width, height, input_height)

	}
	
	arrange(left, top, width, height, input_height)
	{		
		//основные параметры размеров и позиций чата
		this.left=left;
		this.top=top;
		this.width=width;
		this.height=height;		
		this.right=this.left+this.width;		
		this.input_height=input_height;
		this.bottom=this.top+this.height;	
		
		//это параметры стека сообщений
		this.stack_top=this.stack_bottom=this.bottom;
		this.stack_height=0;
								
		//это уголок для изменения размера
		this.static_objects.resize_corner.x=this.right+10;
		this.static_objects.resize_corner.y=this.bottom+this.input_height+10;	
				
		//это фон  чата  (без поля ввода)
		this.static_objects.chat_bcg.x=this.left;
		this.static_objects.chat_bcg.y=this.top;
		this.static_objects.chat_bcg.width=this.width;
		this.static_objects.chat_bcg.height=this.height;	
				
		//маска
		this.static_objects.mask.x=this.left;
		this.static_objects.mask.y=this.top;
		this.static_objects.mask.width=this.width;
		this.static_objects.mask.height=this.height;			
				
		//это фон где печатаются сообщения
		this.static_objects.input_bcg.x=this.left;
		this.static_objects.input_bcg.y=this.bottom;
		this.static_objects.input_bcg.width=this.width;
		this.static_objects.input_bcg.height=this.input_height;	
		
		//это набираемый текста
		this.static_objects.input_text.x=this.static_objects.input_bcg.x+5;
		this.static_objects.input_text.y=this.static_objects.input_bcg.y+this.static_objects.input_bcg.height;	
		this.static_objects.input_text.fontSize=this.static_objects.input_bcg.height;
		this.static_objects.input_text.maxWidth=width-this.static_objects.input_bcg.height*2; //отнимаем место для 2 кнопок
		this.static_objects.input_text.fill=0x223344;
		
		//это плейсхолдер для текст бокса
		this.static_objects.input_placeholder.x=this.static_objects.input_bcg.x;
		this.static_objects.input_placeholder.y=this.static_objects.input_bcg.y+this.static_objects.input_bcg.height;
		this.static_objects.input_placeholder.fontSize=this.static_objects.input_bcg.height;
		this.static_objects.input_placeholder.alpha=0.3;
		
		//курсор текстового блока
		this.static_objects.text_cursor.height=this.static_objects.input_bcg.height;
		this.static_objects.text_cursor.x=this.static_objects.input_text.x+this.static_objects.input_text.width;
		this.static_objects.text_cursor.y=this.static_objects.input_bcg.y+this.static_objects.input_bcg.height;		
				
		//кнопка отправки текстового сообщения
		this.static_objects.send_button.x=this.static_objects.input_bcg.x+this.static_objects.input_bcg.width-this.static_objects.input_bcg.height;
		this.static_objects.send_button.y=this.static_objects.input_bcg.y;
		this.static_objects.send_button.height=this.static_objects.input_bcg.height;
		this.static_objects.send_button.width=this.static_objects.input_bcg.height;
		
		//кнопка добавления объекта в чата		
		this.static_objects.menu_button.x=this.static_objects.input_bcg.x+this.static_objects.input_bcg.width;
		this.static_objects.menu_button.y=this.static_objects.input_bcg.y;
		this.static_objects.menu_button.height=this.static_objects.input_bcg.height;
		this.static_objects.menu_button.width=this.static_objects.input_bcg.height;
				
		//это фон объектов для добавления		
		this.static_objects.menu_bcg.x=this.right-300-5;
		this.static_objects.menu_bcg.y=this.bottom-300-5;
		this.static_objects.menu_bcg.width=300;
		this.static_objects.menu_bcg.height=300;
		
		//формируем меню в 2 колонки
		var grid_places=new grid_placer_class(this.static_objects.menu_bcg.x,this.static_objects.menu_bcg.y,this.static_objects.menu_bcg.width,2);
		
		for (var i=0;i<this.menu_items.length;i++)
		{
			var place_data=grid_places.get_new_placement(game_objects[i][0].width,game_objects[i][0].height);			
			this.menu_items[i].sprite.x=place_data[0];
			this.menu_items[i].sprite.y=place_data[1];
			this.menu_items[i].sprite.width=place_data[2];
			this.menu_items[i].sprite.height=place_data[3];
			
			this.menu_items[i].frame.width=this.menu_items[i].sprite.width;
			this.menu_items[i].frame.height=this.menu_items[i].sprite.height;	
			this.menu_items[i].frame.x=this.menu_items[i].sprite.x;
			this.menu_items[i].frame.y=this.menu_items[i].sprite.y;	
		}
	

		//запускаем рекурсивное обновление стека сообщений,но порядок - снизу вверх от текущего топа.
		if (this.new_msg_index!==-1)
			this.rebuild_message(this.new_msg_index,this.stack_top);
	
	
	}
			
	mouse_down(e)
	{
		//получаем и запоминаем текущее положение курсора мышки
		var x=e.data.global.x/app.stage.scale.x;
		var y=e.data.global.y/app.stage.scale.y;	
		
		this.prv_mouse_x=x;
		this.prv_mouse_y=y;

		//фиксируем нажатую кнопку
		this.bcg_down=true;
	}
	
	mouse_up()
	{		
		this.bcg_down=false;
	}
			
	mouse_move(e)
	{
		//получаем текущее положение курсора мышки
		var x=e.data.global.x/app.stage.scale.x;
		var y=e.data.global.y/app.stage.scale.y;
		
		var dx=x-this.prv_mouse_x;
		var dy=y-this.prv_mouse_y;	
		
		//сдвигаем чат в соответствии с новыми размерами
		if (this.bcg_down===true)
			this.move(dx,dy);
		
		//перестраиваем весь чат и сообщение в соответствии с новыми размерами и обновляем параметры стека сообщений
		if (this.cor_down===true)
		{
			this.arrange(this.left,this.top,this.width+dx, this.height+dy, this.input_height);
			this.update_stack_parameters();
		}
		
		//запоминаем положение мыши
		this.prv_mouse_x=x;
		this.prv_mouse_y=y;
	}
		
	corner_over()
	{
		//устанавливаем вид курсора при наведении на уголок 
		app.renderer.plugins.interaction.cursorStyles.default = 'nwse-resize';
		app.renderer.plugins.interaction.setCursorMode('nwse-resize');
	}
	
	corner_out()
	{	
		//возвращаем стандартный вид указателя
		app.renderer.plugins.interaction.cursorStyles.default = 'auto';
		app.renderer.plugins.interaction.setCursorMode('auto');
	}		
	
	corner_down(e)
	{
		//запоминаем положение мыши
		var x=e.data.global.x;
		var y=e.data.global.y;
		
		this.cor_down=true;
	}

	corner_up()
	{

		this.cor_down=false;
	}	
	
	show_menu()
	{		
		//отображаем список объектов для добавления в чат
		this.static_objects.menu_bcg.visible=!this.static_objects.menu_bcg.visible;
		for (var i=0;i<this.menu_items.length;i++)
		{
			this.menu_items[i].sprite.visible=this.static_objects.menu_bcg.visible;		
			this.menu_items[i].frame.visible=this.static_objects.menu_bcg.visible;		
		}

	}
	
	hide_menu()
	{
		this.static_objects.menu_bcg.visible=false;
		for (var i=0;i<this.menu_items.length;i++)
		{
			this.menu_items[i].sprite.visible=this.static_objects.menu_bcg.visible;		
			this.menu_items[i].frame.visible=this.static_objects.menu_bcg.visible;		
		}
	}
			
	get_oldest_message()
	{
		var oldest_index = 0;
		for (var i = 1; i < this.messages.length; i++)
			if (this.messages[i].timestamp < this.messages[oldest_index].timestamp) oldest_index = i;
		return oldest_index;
	}	
		
	move(dx,dy)
	{		
	
		//сдвигаем общие параметры чата и стека сообщений
		this.left+=dx;
		this.top+=dy;
		this.right+=dx;		
		this.bottom+=dy;	
		this.stack_top+=dy;
		this.stack_bottom+=dy;
	
		//двигаем основные элементы чата
		for (var key in this.static_objects)
		{
			this.static_objects[key].x+=dx;
			this.static_objects[key].y+=dy;
		}
		
		//двигаем меню со всеми элементами
		for (var i=0;i<this.menu_items.length;i++)
		{
			this.menu_items[i].sprite.x+=dx;
			this.menu_items[i].sprite.y+=dy;
			
			this.menu_items[i].frame.x+=dx;
			this.menu_items[i].frame.y+=dy;
		}	
		
		//двигаем сообщения
		for (var i=0;i<chat_size;i++)
		{	
			for (var key in this.messages[i].objects)
			{
				this.messages[i].objects[key].x+=dx;
				this.messages[i].objects[key].y+=dy;
			}	
		}
		
	}
	
	shift_message(i, dy)
	{		
		for (var key in this.messages[i].objects)
			this.messages[i].objects[key].y+=dy;			
	}
		
	collapse_stack()
	{
		this.need_collapse=false;
		for (var i=0;i<chat_size;i++)
		{
			if (this.messages[i].objects.bcg.visible===true)
			{
				var cur_bottom=this.messages[i].objects.bcg.y+this.messages[i].objects.bcg.height+15;
				var next_id=this.messages[i].next_msg_index;
				if (next_id!==-1)
				{					
					var next_top=this.messages[next_id].objects.bcg.y;
					var dy=next_top-cur_bottom;				
					if (dy>0.15)
					{
						this.shift_message(next_id,-dy/5);
						this.need_collapse=true;
					}
				}
			}			
		}
				
		if (this.need_collapse===true)
			this.update_stack_parameters();

	}
	
	delete_message(index)
	{
		
		//делаем все элементы сообщения невидимыми
		for (var key in this.messages[index].objects)
			this.messages[index].objects[key].visible=false;
		
		var prv_msg_index=this.messages[index].prv_msg_index;
		var next_msg_index=this.messages[index].next_msg_index;
				
		if (prv_msg_index!==-1)
		this.messages[prv_msg_index].next_msg_index=this.messages[index].next_msg_index;
	
		if (next_msg_index!==-1)
		this.messages[next_msg_index].prv_msg_index=this.messages[index].prv_msg_index;
	
		if (index===this.new_msg_index)
			this.new_msg_index=prv_msg_index;
		
		if (index===this.old_msg_index)
		{
			this.old_msg_index=this.messages[index].next_msg_index;
			this.messages[next_msg_index].prv_msg_index=-1;
		}
	
		//запускаем процесс ликвидации шелей
		this.need_collapse=true;
		this.update_stack_parameters();
	}
		
	shift_stack(val)
	{

		
		for (var i=0;i<chat_size;i++)
		{			
			if (this.messages[i].objects.bcg.visible===true)
			{
				for (var key in this.messages[i].objects)
					this.messages[i].objects[key].y+=val;
			}
		}
		
		this.update_stack_parameters();	
	}
	
	arrange_message_horizontal(index, message_text, obj_id)
	{	
		//обновляем и располагаем все элементы сообщения...
		
		if (message_text===undefined)
			message_text=this.messages[index].objects.b_text.text;
		
		if (obj_id===undefined)
			obj_id=this.messages[index].obj_id;
		
		
		
		//устанавливаем имя 
		this.messages[index].objects.nickname_text.text=this.messages[index].sender[0];	
		
		
		if (this.messages[index].obj_id===-1)
		{			
			//сначала определяем размеры нового текста и фона чтобы под него подстроить остальные элементы
			this.messages[index].objects.b_text.maxWidth=this.width-5-30-5-5-5-5-20;
			this.messages[index].objects.b_text.text=message_text;		
			this.messages[index].objects.b_text.visible=true;		
			
						
			//устанавливаем краткие обозначения размеров текста и фона для удобства
			var text_w=this.messages[index].objects.b_text.width;
			var text_h=this.messages[index].objects.b_text.height;			
			
			var bcg_w=this.messages[index].objects.bcg.width=text_w+10;
			var bcg_h=this.messages[index].objects.bcg.height=text_h+5;	
			this.messages[index].objects.bcg.stop();

			//утанавливаем фон для сообщений в зависимости от автора сообщения
			if (my_name===this.messages[index].sender)
				this.messages[index].objects.bcg.texture=game_res.resources["message_bcg_my"].texture;
			else
				this.messages[index].objects.bcg.texture=game_res.resources["message_bcg"].texture;

		}
		else
		{			
			//в случае картинки текст не показываем но текст записываем чтобы потом перестроить
			this.messages[index].objects.b_text.visible=false;	
			this.messages[index].objects.b_text.text=message_text;						
			
			var text_w=game_objects[obj_id][0].width;
			var text_h=game_objects[obj_id][0].height
			
			this.messages[index].objects.bcg.textures=game_objects[obj_id];
			this.messages[index].objects.bcg.play();
			this.messages[index].objects.bcg.animationSpeed=0.3;
			var tar_w=this.width-5-30-5-5-20-32;
			tar_w=Math.min(tar_w,200);
			var ratio=tar_w/text_w;			
			
			var bcg_w=this.messages[index].objects.bcg.width=text_w*ratio;
			var bcg_h=this.messages[index].objects.bcg.height=text_h*ratio;	
		}	
			
			
		//устанавливаем положение элементов сообщения по оси X в зависимости от автора сообщения
		if (my_name===this.messages[index].sender)
		{	
			this.browsing_mode=false;
			this.messages[index].objects.nickname_text.x=this.right-5-30+5; //последнее +5 чтобы по центру
			this.messages[index].objects.nickname_bcg.x=this.right-5-30;
			this.messages[index].objects.bcg.x=this.right-5-30-5-bcg_w; //margin+nickname.width+margin			
			this.messages[index].objects.delete_button.x=this.right-5-30-5-bcg_w-5-20;	
			this.messages[index].objects.b_text.x=this.right-5-30-5-5-text_w;//margin+nickname.width+margin+margin	
			this.browsing_mode=false;
		}
		else
		{
			this.messages[index].objects.nickname_text.x=this.left+5+5;//последнее +5 чтобы по центру
			this.messages[index].objects.nickname_bcg.x=this.left+5;
			this.messages[index].objects.bcg.x=this.left+5+30+5; //margin+nickname.width+margin	
			this.messages[index].objects.delete_button.x=this.left+5+30+5+bcg_w+5;
			this.messages[index].objects.b_text.x=this.left+5+30+5+5;//margin+nickname.width+margin+margin				
		}	
		
	}
	
	rebuild_message(index, temp_stack_top)
	{		
		//форматируем сообщение по оси X
		this.arrange_message_horizontal(index);
			
		//устанавливаем положение элементов сообщения по шакале Y
		temp_stack_top=temp_stack_top-this.messages[index].objects.bcg.height-15;
		
		//устанавливаем положение элементов сообщения по шакале Y
		for (var key in this.messages[index].objects)
			this.messages[index].objects[key].y=temp_stack_top;	
		this.messages[index].objects.delete_button.y=temp_stack_top+this.messages[index].objects.bcg.height/2;
		
		//если это последнее сообщение то возвращаемся
		if (index===this.old_msg_index)
			return;
		
		//форматируем предыдущее сообщение в стеке
		this.rebuild_message(this.messages[index].prv_msg_index,temp_stack_top);
	}
		
	add_message(message_text, timestamp, sender, key, obj_id)
	{			
		//выбираем самое старое или неактивное сообщение чтобы использовать его для нового
		var prv_new_msg_index=this.new_msg_index;
		this.new_msg_index=this.get_oldest_message();
		
		//фиксируем время сообщения
		this.messages[this.new_msg_index].timestamp=timestamp;
		
		//фиксируем отправителя
		this.messages[this.new_msg_index].sender=sender;
		
		//фиксируем номер объекта если есть
		this.messages[this.new_msg_index].obj_id=obj_id;
		
		//фиксируем ключ сообщения
		this.messages[this.new_msg_index].key=key;					
		


		//форматируем сообщение по оси X
		this.arrange_message_horizontal(this.new_msg_index,message_text,obj_id);
			
			
		//устанавливаем положение элементов сообщения по шакале Y
		for (var key in this.messages[this.new_msg_index].objects)
			this.messages[this.new_msg_index].objects[key].y=this.stack_bottom;	
		
		//кнопку удаления располагаем посередине сообщения
		this.messages[this.new_msg_index].objects.delete_button.y=this.stack_bottom+this.messages[this.new_msg_index].objects.bcg.height/2;

		//включаем видимость всех элементов сообщения
		this.messages[this.new_msg_index].objects.nickname_bcg.visible=		true;			
		this.messages[this.new_msg_index].objects.bcg.visible=				true;			
		this.messages[this.new_msg_index].objects.delete_button.visible=	true;	
		this.messages[this.new_msg_index].objects.nickname_text.visible=	true;
		this.messages[this.new_msg_index].objects.bcg.interactive=			true;
		this.messages[this.new_msg_index].objects.bcg.buttonMode=			true;
		this.messages[this.new_msg_index].objects.bcg.pointerdown=this.stop_anim.bind(this,this.new_msg_index);
		

		
		//записываем данные о предыдущем сообщении
		this.messages[this.new_msg_index].prv_msg_index=prv_new_msg_index;
						
		//определяем какое теперь самое старое сообщение
		if (this.new_msg_index===this.old_msg_index)
			this.old_msg_index=this.messages[this.new_msg_index].next_msg_index;
		if (this.old_msg_index===-1)
			this.old_msg_index=0;
		
		//у нового сообщения нет следующего сообщения так как оно самое актуальное
		this.messages[this.new_msg_index].next_msg_index=-1;
		
		//и для самого старого сообщения нет предыдущего сообщения	
		this.messages[this.old_msg_index].prv_msg_index=-1;
				
		//а для сообщения которое раньше было актуальным, обновляем индекс следующего сообщения
		if (prv_new_msg_index!==-1)
			this.messages[prv_new_msg_index].next_msg_index=this.new_msg_index;
		
		//увличиваем позицию конца стека сообщений с учетом расстояния между сообщениями - 15 пискелей
		chat.last_message_ts=timestamp;
		this.update_stack_parameters();
	}	

	stop_anim(i)
	{
		if (this.messages[i].objects.bcg.playing===true)
			this.messages[i].objects.bcg.stop();
		else
			this.messages[i].objects.bcg.play();
	}
	
	update_stack_parameters()
	{
		if (this.old_msg_index!==-1)
			this.stack_top=this.messages[this.old_msg_index].objects.bcg.y;
		if (this.new_msg_index!==-1)
			this.stack_bottom=this.messages[this.new_msg_index].objects.bcg.y+this.messages[this.new_msg_index].objects.bcg.height+15;
		this.stack_height=this.stack_bottom-this.stack_top;
	}
		
	send_key(key)
	{
		this.static_objects.input_text.text=this.static_objects.input_text.text+key;
		var num_of_line=this.static_objects.input_text.height/35;
		this.static_objects.input_bcg.height=num_of_line*this.input_height;
		this.static_objects.input_bcg.y=this.bottom-(num_of_line-1)*this.input_height
		this.static_objects.input_text.y=this.static_objects.input_bcg.y+this.static_objects.input_bcg.height;		
		
		this.static_objects.text_cursor.y=this.static_objects.input_text.y;
		this.static_objects.text_cursor.x=this.static_objects.input_text.x+this.static_objects.input_text.width;
		
		
		if (this.static_objects.input_placeholder.visible===true)
			this.static_objects.input_placeholder.visible=false;
	}
	
	remove_last_key()
	{
		this.static_objects.input_text.text=this.static_objects.input_text.text.slice(0, -1);		
		this.static_objects.text_cursor.y=this.static_objects.input_text.y;
		this.static_objects.text_cursor.x=this.static_objects.input_text.x+this.static_objects.input_text.width;
	}
		
	send_message(obj_id)
	{
		//только если что-то написано
		if (this.static_objects.input_text.text==="" && obj_id===-1 )
			return;
		
		//записываем в базу данных
		database.ref("messages").push().set({
			"sender":my_name,
			"message":this.static_objects.input_text.text,
			"timestamp": firebase.database.ServerValue.TIMESTAMP,
			"obj_id":obj_id
		});

		//если включен объект, то просто выходим И не заморачиваемся с текстом
		if (obj_id!==-1)
		{
			this.hide_menu();
			return;
		}
		
		//восставнавливаем размер области печати, который мог быть изменен при многострочном тексте
		this.static_objects.input_bcg.height=this.input_height;	
		this.static_objects.input_bcg.y=this.bottom;
		this.static_objects.input_text.y=this.static_objects.input_bcg.y;

		//возвращаемс курсор текста
		this.static_objects.text_cursor.x=this.static_objects.input_bcg.x;
		this.static_objects.text_cursor.y=this.static_objects.input_bcg.y+this.static_objects.input_bcg.height;

		//показываем плейсхолдер
		this.static_objects.input_placeholder.visible=true;

		//очищаем панель набора текста
		this.static_objects.input_text.text="";	
	}
		
	process()
	{
		//если появилось указание что стек сообщений нужно перестроить, то запускаем рекурсивный процесс перестройки
		if (this.need_collapse===true)
			this.collapse_stack();
		
		//плавно добавляем новые сообщения
		if (this.browsing_mode===false)
		{
			var dy=this.bottom-this.stack_bottom;
			if (Math.abs(dy)>1.5)
				this.shift_stack(dy/5);			
		}
		
		this.tick++;
		if (this.tick===20)
		{
			this.tick=0;
			this.static_objects.text_cursor.visible=!this.static_objects.text_cursor.visible;
		}
	}
	
}

function resize()
{
    const vpw = window.innerWidth;  // Width of the viewport
    const vph = window.innerHeight; // Height of the viewport
    let nvw; // New game width
    let nvh; // New game height
    
    if (vph / vpw < M_HEIGHT / M_WIDTH) {
      nvh = vph;
      nvw = (nvh * M_WIDTH) / M_HEIGHT;
    } else {
      nvw = vpw;
      nvh = (nvw * M_HEIGHT) / M_WIDTH;
    }    
    app.renderer.resize(nvw, nvh);
    app.stage.scale.set(nvw / M_WIDTH, nvh / M_HEIGHT);
}

function on_wheel(e)
{

	//вниз
	if (e.deltaY>0 )
	{
		if (chat.stack_bottom>chat.bottom)
			chat.shift_stack(-25);
		else
			chat.browsing_mode=false;
	}	
	 	 
	//вверх
	if (e.deltaY<0 )
	{
		if (chat.top>chat.stack_top)
		{
			chat.shift_stack(25);	
			chat.browsing_mode=true;
		}
	}	
}

function load()
{
	//проверяем WEB GL	
	const gl = document.createElement('canvas').getContext('webgl2');
	if (!gl)
	{
	  if (typeof WebGL2RenderingContext !== 'undefined')
	  {
		alert('WebGL2 disabled or unavailable. Game can not start.');
		finish();
		return;
	  }
	  else
	  {
		alert('WebGL2 not supported. Game can not start.'); 
		finish();
		return;
	  }
	}
	
	//загружаем ресурсы в соответствии с листом загрузки
	game_res=new PIXI.Loader();	
	for (var l=0;l<load_list.length;l++)
		for (var i=0;i<load_list[l].length;i++)
			if (load_list[l][i][0]=="sprite" || load_list[l][i][0]=="image") 
				game_res.add(load_list[l][i][1], "res/"+load_list[l][i][1]+".png");
	
	//загружаем ресурсы для чата
	game_res.add("chat_bcg", "chat_bcg.png");
	game_res.add("message_bcg", "message_bcg.png");
	game_res.add("message_bcg_my", "message_bcg_my.png");
	game_res.add("input_bcg", "input_bcg.png");
	game_res.add("chat_mask", "chat_mask.png");
	game_res.add("nickname_bcg", "nickname_bcg.png");
	game_res.add("delete_button", "delete_button.png");
	game_res.add("text_cursor", "text_cursor.png");
	game_res.add("menu_button", "menu_button.png");
	game_res.add("send_button", "send_button.png");
	game_res.add("menu_bcg", "menu_bcg.png");
	game_res.add("resize_corner", "resize_corner.png");
	game_res.add("test_image", "image0.png");
	game_res.add("item_frame", "item_frame.png");
	game_res.add("m2_font", "m_font.fnt");
	game_res.add("image1", "image1.png");
	
	game_res.add("anim_0", "anim/0.png");
	game_res.add("anim_1", "anim/1.png");
	game_res.add("anim_2", "anim/2.png");
	game_res.add("anim_3", "anim/3.png");
	game_res.add("anim_4", "anim/4.png");
	game_res.add("anim_5", "anim/5.png");
	
	game_res.add("coin_0", "coin/0.png");
	game_res.add("coin_1", "coin/1.png");
	game_res.add("coin_2", "coin/2.png");
	game_res.add("coin_3", "coin/3.png");
	game_res.add("coin_4", "coin/4.png");
	game_res.add("coin_5", "coin/5.png");
	
	
	
				
	game_res.load(load_complete);		
	
	function load_complete()
	{	
		app = new PIXI.Application({width:M_WIDTH, height:M_HEIGHT,antialias:true,backgroundColor : 0x6626A0});
		app.renderer.autoResize=true;

		document.body.appendChild(app.view);
		document.body.style.backgroundColor = "blue";
		

		resize();
		window.addEventListener("resize", resize);		
		
		//создаем спрайты и массивы спрайтов
		for (var l=0;l<load_list.length;l++)
		{
			for (var i=0;i<load_list[l].length;i++)
			{			
				var obj_class=load_list[l][i][0];
				var obj_name=load_list[l][i][1];

				switch(obj_class)
				{			
					case "sprite":
						objects[obj_name]=new PIXI.Sprite(game_res.resources[obj_name].texture);
						objects[obj_name].x=load_list[l][i][2];
						objects[obj_name].y=load_list[l][i][3];
						eval(load_list[l][i][4]);
						app.stage.addChild(objects[obj_name]);	
					break;
					
					case "block":
						eval(load_list[l][i][4]);
						objects[obj_name].x=load_list[l][i][2];
						objects[obj_name].y=load_list[l][i][3];						
						app.stage.addChild(objects[obj_name]);	
					break;
				}
			}
		}
		
		
		//формируем базу анимационных объектов
		game_objects[0]=[game_res.resources["test_image"].texture]
		game_objects[1]=[game_res.resources["anim_0"].texture,game_res.resources["anim_1"].texture,game_res.resources["anim_2"].texture,game_res.resources["anim_3"].texture,game_res.resources["anim_4"].texture,game_res.resources["anim_5"].texture];
		game_objects[2]=[game_res.resources["coin_0"].texture,game_res.resources["coin_1"].texture,game_res.resources["coin_2"].texture,game_res.resources["coin_3"].texture,game_res.resources["coin_4"].texture];
		game_objects[3]=[game_res.resources["image1"].texture]		


		//создаем чат
		chat=new chat_class(20,50,300,300,35);
				
		window.onkeydown = function (e)
		{		
            if ((e.keyCode > 47 	&& e.keyCode < 58) || 
				(e.keyCode > 64 	&& e.keyCode < 91) || 
				(e.keyCode > 185 	&& e.keyCode < 193) || 
				(e.keyCode > 218 	&& e.keyCode < 223) ||
				 e.keyCode===32)
				chat.send_key(e.key);
			
			if (e.keyCode === 8)
				chat.remove_last_key();				
			
			if (e.keyCode ===13)
				chat.send_message(-1);
		}
		
		window.addEventListener("mousewheel", on_wheel);		
					

		//это событие нового сообщения из базы данных firebase
		firebase.database().ref("messages").limitToLast(25).on("child_added", function (snapshot) {
			chat.add_message(snapshot.val().message, snapshot.val().timestamp, snapshot.val().sender, snapshot.key, snapshot.val().obj_id)
		});
		
		//это событие нового сообщения
		firebase.database().ref("messages").on("child_removed", function (snapshot) {
			chat.add_message(snapshot.val().message, snapshot.val().timestamp, snapshot.val().sender, snapshot.key)
		});
		
		
		//запускаем главный цикл
		main_loop();
	}

	
}

function main_loop()
{
	chat.process();
    app.render(app.stage);
	requestAnimationFrame(main_loop);
}


