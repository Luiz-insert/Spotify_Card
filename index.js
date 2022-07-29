const client_id = "b5e269953b144038af6f2eae30aa7235";
const client_secret = "dbeaae0f69ab4ecb8b01f55e7506fc42";
const top_tracks = "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=10&offset=0";
const user_profile = "https://api.spotify.com/v1/me";
//
//
const token = "https://accounts.spotify.com/api/token"
const authorize = "https://accounts.spotify.com/authorize";




async function spotfy() {
    let accessToken ='';
    let inputToken = document.getElementById('search');
    let result = inputToken.value
    let request = await fetch(top_tracks, {
        method: 'GET',
            headers: 
            {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+result
            }

    })
    let request_user = await fetch (user_profile, {
        method: 'GET',
            headers:
            {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+result
            }
    })

    let list = await request.json();
    let list_user = await request_user.json();
    function display() {
        let imgPhoto = document.getElementById('imgPhoto')
        let profileimg = list_user.images[0].url;
        let userName = list_user.display_name;
        let email = list_user.email;
        let dataUser1 = document.querySelector('.user');
        let dataUser2 = document.getElementById('userid');
        let emailUser = document.querySelector('.email');
        
        dataUser1.textContent = userName;
        emailUser.textContent = email;
        dataUser2.textContent = userName;
        imgPhoto.setAttribute(`src`,`${profileimg}`)
    
    }
    display();
    function top10 ()
    {
        document.querySelector('.artistVerse1').textContent = list.items[0].artists[0].name;
        document.querySelector('.musicVerse1').textContent = ('| (') + list.items[0].name + ')'

        document.querySelector('.artistVerse2').textContent = list.items[1].artists[0].name;
        document.querySelector('.musicVerse2').textContent = ('| (') + list.items[1].name + ')'

        document.querySelector('.artistVerse3').textContent = list.items[2].artists[0].name;
        document.querySelector('.musicVerse3').textContent = ('| (') + list.items[2].name + ')'

        document.querySelector('.artistVerse4').textContent = list.items[3].artists[0].name;
        document.querySelector('.musicVerse4').textContent = ('| (') + list.items[3].name + ')'

        document.querySelector('.artistVerse5').textContent = list.items[4].artists[0].name;
        document.querySelector('.musicVerse5').textContent = ('| (') + list.items[4].name + ')'

        document.querySelector('.artistVerse6').textContent = list.items[5].artists[0].name;
        document.querySelector('.musicVerse6').textContent = ('| (') + list.items[5].name + ')'

        document.querySelector('.artistVerse7').textContent = list.items[6].artists[0].name;
        document.querySelector('.musicVerse7').textContent = ('| (') + list.items[6].name + ')'

        document.querySelector('.artistVerse8').textContent = list.items[7].artists[0].name;
        document.querySelector('.musicVerse8').textContent = ('| (') + list.items[7].name + ')'

        document.querySelector('.artistVerse9').textContent = list.items[8].artists[0].name;
        document.querySelector('.musicVerse9').textContent = ('| (') + list.items[8].name + ')'

        document.querySelector('.artistVerse10').textContent = list.items[9].artists[0].name;
        document.querySelector('.musicVerse10').textContent = ('| (') + list.items[9].name + ')'
        
    }
    top10(); 
    
    return  (list, list_user);    
}

 
